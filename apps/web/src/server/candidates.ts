import "server-only";
import { createHash } from "node:crypto";
import { DataError } from "@straatbeeld/contracts";
import { candidateSchema, candidateRequestSchema, createCandidate, decideCandidate, type CandidateRequest, type CandidateReviewRequest } from "@straatbeeld/contracts/candidates";
import { supabaseAdmin } from "./supabase";
import municipality from "../../../../config/municipality.json";
function connected() {
  if (process.env.DATA_BACKEND !== "supabase") throw new DataError("BACKEND_NOT_CONNECTED", "Meldingen opslaan vereist de projectdatabase.", 501);
}
export async function listCandidates() {
  connected();
  const { data, error } = await supabaseAdmin().from("straatbeeld_candidates").select("payload").eq("municipality", municipality.naam).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new DataError("DATABASE_ERROR", "Meldingen konden niet worden geladen.", 503);
  return data.map(row => candidateSchema.parse(row.payload));
}
export async function reportCandidate(request: CandidateRequest, actor: string) {
  connected();
  if (request.address.municipality !== municipality.naam || !municipality.postcodes.includes(request.address.postalCode)) throw new DataError("INVALID_LOCATION", "Meld een zaak binnen de ingestelde gemeente.", 400);
  const payload = createCandidate(request, actor, new Date().toISOString());
  const normalize = (s: string) => s.trim().toLocaleLowerCase("nl-BE").replace(/\s+/g," ");
  const fingerprint = createHash("sha256").update(JSON.stringify([request.name, request.address.street, request.address.houseNumber, request.address.postalCode, request.address.municipality].map(normalize))).digest("hex");
  const { error } = await supabaseAdmin().from("straatbeeld_candidates").insert({ id: payload.id, municipality: request.address.municipality, fingerprint, version: 0, status: "pending", payload });
  if (error?.code === "23505") {
    const existing = await supabaseAdmin().from("straatbeeld_candidates").select("payload").eq("id", request.id).maybeSingle();
    if (!existing.error && existing.data) {
      const candidate = candidateSchema.parse(existing.data.payload);
      const original = candidateRequestSchema.strip().parse(candidate);
      if (candidate.createdBy === actor && JSON.stringify(original) === JSON.stringify(request)) return candidate;
    }
    throw new DataError("DUPLICATE_CANDIDATE", "Deze zaak is al gemeld. Bekijk de bestaande meldingen.", 409);
  }
  if (error) throw new DataError("DATABASE_ERROR", "De melding kon niet worden opgeslagen.", 503);
  return payload;
}
export async function reviewCandidate(id: string, request: CandidateReviewRequest, actor: string) {
  connected();
  const db = supabaseAdmin();
  const { data, error } = await db.from("straatbeeld_candidates").select("payload").eq("id", id).eq("municipality", municipality.naam).maybeSingle();
  if (error) throw new DataError("DATABASE_ERROR", "Melding kon niet worden geladen.", 503);
  if (!data) throw new DataError("NOT_FOUND", "Melding niet gevonden.", 404);
  const payload = decideCandidate(candidateSchema.parse(data.payload), request, actor, new Date().toISOString());
  const result = await db.from("straatbeeld_candidates").update({ payload, version: payload.revision, status: payload.status }).eq("id", id).eq("version", request.expectedRevision).eq("status", "pending").select("id");
  if (result.error) throw new DataError("DATABASE_ERROR", "De beslissing kon niet worden opgeslagen.", 503);
  if (!result.data.length) throw new DataError("REVISION_CONFLICT", "Deze melding is intussen beoordeeld. Laad opnieuw.", 409);
  return payload;
}
