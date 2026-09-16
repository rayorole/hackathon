import "server-only";
import {
  DataError,
  detailSchema,
  matches,
  type Detail,
  type Filters,
  type ReviewRequest,
} from "@straatbeeld/contracts";
import {
  createFixtures,
  fixtureCoverage,
} from "@straatbeeld/contracts/fixtures";
import { applyReview, approvedCsv } from "@straatbeeld/contracts/demo";
import { supabaseAdmin } from "./supabase";
function isLive() {
  return process.env.DATA_BACKEND === "supabase";
}
export async function listDetails(filters: Filters = {}): Promise<Detail[]> {
  if (!isLive())
    return createFixtures().filter((d) => matches(d.establishment, filters));
  let q = supabaseAdmin()
    .from("straatbeeld_cases")
    .select("detail")
    .eq("detail->establishment->>isDemo", "false")
    .order("id");
  if (filters.municipality) q = q.eq("municipality", filters.municipality);
  if (filters.street) q = q.eq("street", filters.street);
  const { data, error } = await q.limit(1000);
  if (error)
    throw new DataError(
      "DATABASE_ERROR",
      "Database niet beschikbaar. Controleer de serverconfiguratie.",
      503,
    );
  return data.map((r) => detailSchema.parse(r.detail));
}
export async function list(filters: Filters = {}) {
  const details = await listDetails(filters);
  return {
    items: details.map((d) => d.establishment),
    coverage: isLive()
      ? {
          mode: "supabase" as const,
          labelNl:
            "Gedeeltelijke VKBO-steekproef van 7 september 2026; maximaal 1000 vestigingen per aanvraag. Actuele lokale activiteit nog niet vastgesteld. Raadpleeg de datum per bron.",
          completeMunicipality: false,
          registrySnapshotDate: null,
        }
      : fixtureCoverage(),
  };
}
export async function detail(id: string) {
  if (!isLive()) {
    const d = createFixtures().find((d) => d.establishment.id === id);
    if (!d) throw new DataError("NOT_FOUND", "Vestiging niet gevonden.", 404);
    return d;
  }
  const { data, error } = await supabaseAdmin()
    .from("straatbeeld_cases")
    .select("detail")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new DataError("DATABASE_ERROR", "Database niet beschikbaar.", 503);
  if (!data) throw new DataError("NOT_FOUND", "Vestiging niet gevonden.", 404);
  return detailSchema.parse(data.detail);
}
export async function review(request: ReviewRequest) {
  if (!isLive())
    throw new DataError(
      "BACKEND_NOT_CONNECTED",
      "Gebruik oefenmodus of verbind Supabase voor opgeslagen beoordelingen.",
      501,
    );
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("straatbeeld_cases")
    .select("id,version,detail")
    .contains("detail", {
      establishment: { proposals: [{ id: request.proposalId }] },
    })
    .limit(2);
  if (error)
    throw new DataError("DATABASE_ERROR", "Database niet beschikbaar.", 503);
  if (!data?.length)
    throw new DataError("NOT_FOUND", "Voorstel niet gevonden.", 404);
  if (data.length !== 1)
    throw new DataError(
      "AMBIGUOUS_PROPOSAL",
      "Voorstel-ID is niet uniek.",
      409,
    );
  const row = data[0],
    result = applyReview(
      detailSchema.parse(row.detail),
      request,
      crypto.randomUUID(),
      new Date().toISOString(),
    );
  const { data: updated, error: updateError } = await db
    .from("straatbeeld_cases")
    .update({
      detail: result.detail,
      version: row.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("version", row.version)
    .select("id");
  if (updateError)
    throw new DataError(
      "DATABASE_ERROR",
      "Beoordeling kon niet worden opgeslagen.",
      503,
    );
  if (!updated?.length)
    throw new DataError(
      "REVISION_CONFLICT",
      "Een andere beoordeling wijzigde deze vestiging. Laad opnieuw.",
      409,
    );
  return result.review;
}
export async function exportCsv(filters: Filters) {
  return approvedCsv(await listDetails(filters), filters);
}

export async function refresh(id: string) {
  if (!isLive())
    return {
      detail: await detail(id),
      refreshed: false,
      messageNl:
        "Broncontrole vereist de projectdatabase. Oefendata zijn ongewijzigd.",
    };
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("straatbeeld_cases")
    .select("detail,version")
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new DataError("DATABASE_ERROR", "Database niet beschikbaar.", 503);
  if (!data) throw new DataError("NOT_FOUND", "Vestiging niet gevonden.", 404);
  const { research } = await import("../../../../scripts/lib/research");
  let result;
  try {
    result = await research(detailSchema.parse(data.detail));
  } catch {
    throw new DataError(
      "REFRESH_FAILED",
      "Broncontrole niet beschikbaar. Controleer bronbereikbaarheid en AI-budget; bestaand bewijs is behouden.",
      503,
    );
  }
  if (!result.refreshed) return result;
  const saved = await db
    .from("straatbeeld_cases")
    .update({
      detail: result.detail,
      version: data.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("version", data.version)
    .select("id");
  if (saved.error)
    throw new DataError(
      "DATABASE_ERROR",
      "Broncontrole kon niet worden opgeslagen.",
      503,
    );
  if (!saved.data?.length)
    throw new DataError(
      "REVISION_CONFLICT",
      "Een beoordeling wijzigde deze vestiging tijdens broncontrole. Laad opnieuw; er is niets overschreven.",
      409,
    );
  return result;
}
