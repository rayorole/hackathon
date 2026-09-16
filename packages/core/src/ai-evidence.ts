import { z } from "zod";
import { realDate, RecordKind } from "./types";

/** Metadata validation only. The retrieval layer must also check DNS and redirects. */
export const PublicSourceUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
  if (!host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // IP literals are unnecessary for research and include many private/reserved ranges.
  return !host.includes(":") && !/^\d+(\.\d+){3}$/.test(host);
}, "Een openbare HTTP-bron is vereist.");

export const ObservationDate = z.string().refine((value) => value.length === 10 && realDate(value) === value, "Een geldige waarnemingsdatum is vereist.");

export const ResearchSignal = z.enum([
  "website-bereikbaar", "vermelding-kaartdienst", "naam-komt-overeen",
  "adres-komt-overeen", "adres-in-adressenregister", "contactgegevens-aanwezig",
]);
export const ResearchFinding = z.object({
  sourceId: z.string().min(1),
  quote: z.string().trim().min(1),
  observation: z.string().trim().min(1),
  signal: ResearchSignal,
  direction: z.enum(["bevestigt", "weerlegt", "neutraal"]),
  scope: z.enum(["vestiging", "onderneming", "centraal", "onbekend"]),
});
export type ResearchFinding = z.infer<typeof ResearchFinding>;

export const ResearchProposal = z.object({
  kind: z.enum(["geen_wijziging", "nazicht", "correctie"]),
  reason: z.string().trim().min(1),
  field: z.enum(["straat", "huisnr", "postcode", "gemeente", "telefoon", "email"]).nullable(),
  value: z.string().trim().min(1).nullable(),
  sourceIds: z.array(z.string().min(1)),
});
export type ResearchProposal = z.infer<typeof ResearchProposal>;

export const ResearchExtraction = z.object({
  summary: z.string().trim().min(1),
  findings: z.array(ResearchFinding),
  uncertainties: z.array(z.string().trim().min(1)),
  proposal: ResearchProposal,
});
export type ResearchExtraction = z.infer<typeof ResearchExtraction>;

export const SourceSnapshot = z.object({
  id: z.string().min(1),
  url: PublicSourceUrl,
  title: z.string().trim().min(1),
  text: z.string().trim().min(1),
  observedAt: ObservationDate,
  retrievedAt: z.string().datetime({ offset: true }),
  hash: z.string().min(1),
});
export type SourceSnapshot = z.infer<typeof SourceSnapshot>;

export const ResearchResult = ResearchExtraction.extend({
  findings: z.array(ResearchFinding.extend({
    sourceUrl: PublicSourceUrl,
    source: z.string().min(1),
    observedAt: ObservationDate,
  })),
  sources: z.array(SourceSnapshot),
});
export type ResearchResult = z.infer<typeof ResearchResult>;

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function containsValue(quote: string, value: string, field: ResearchProposal["field"]): boolean {
  if (field === "email") {
    const addresses: string[] = normalize(quote).match(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu) ?? [];
    return z.string().email().safeParse(value).success
      && addresses.includes(value);
  }
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}@])${escaped}(?=$|[^\\p{L}\\p{N}@])`, "u").test(normalize(quote));
}

/** Quotes prove passage presence, not the truth of a model's interpretation. Review is required. */
export function validateResearch(
  extraction: unknown,
  sourceInput: unknown,
  recordKind: RecordKind,
): ResearchResult {
  const parsed = ResearchExtraction.parse(extraction);
  const sources = z.array(SourceSnapshot).parse(sourceInput);
  const kind = RecordKind.parse(recordKind);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  if (sourceById.size !== sources.length) throw new Error("Dubbele bronidentificatie.");
  const findings = parsed.findings.map((finding) => {
    const source = sourceById.get(finding.sourceId);
    if (!source) throw new Error("Onbekende bron bij waarneming.");
    if (!normalize(source.text).includes(normalize(finding.quote))) {
      throw new Error("Het citaat is niet teruggevonden in de bron.");
    }
    return { ...finding, sourceUrl: source.url, source: source.title, observedAt: source.observedAt };
  });

  let proposal = parsed.proposal;
  const uncertainties = [...parsed.uncertainties];
  const citedFindings = findings.filter((finding) => proposal.sourceIds.includes(finding.sourceId));
  const contact = proposal.field === "email" || proposal.field === "telefoon";
  const value = proposal.value === null ? "" : normalize(proposal.value);
  const relevantSignal = (finding: ResearchFinding) => contact
    ? finding.signal === "contactgegevens-aanwezig"
    : ["adres-komt-overeen", "adres-in-adressenregister"].includes(finding.signal);
  const supporting = citedFindings.filter((finding) => finding.direction === "bevestigt"
    && finding.scope === kind && relevantSignal(finding)
    && containsValue(finding.quote, value, proposal.field));
  const contradiction = findings.some((finding) => finding.scope === kind
    && finding.direction === "weerlegt" && relevantSignal(finding));
  const supported = proposal.field !== null && value.length > 0 && proposal.sourceIds.length > 0
    && !contradiction
    && proposal.sourceIds.every((id) => supporting.some((finding) => finding.sourceId === id));
  if (proposal.kind === "correctie" && !supported) {
    proposal = { ...proposal, kind: "nazicht", field: null, value: null, sourceIds: proposal.sourceIds.filter((id) => sourceById.has(id)) };
    uncertainties.push("De voorgestelde waarde is niet voldoende onderbouwd voor dit record.");
  } else if (proposal.kind !== "correctie") {
    proposal = { ...proposal, field: null, value: null, sourceIds: proposal.sourceIds.filter((id) => sourceById.has(id)) };
  }
  return ResearchResult.parse({ ...parsed, findings, uncertainties, proposal, sources });
}
