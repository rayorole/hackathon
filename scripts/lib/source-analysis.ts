import { z } from "zod";
import { createHash } from "node:crypto";
import { detailSchema, type Detail } from "../../packages/contracts/src/index";
export const claimSchema = z
  .object({
    sourceId: z.string(),
    field: z.enum(["openingHours", "telephone", "email", "localService"]),
    value: z.string().min(1).max(400),
    excerpt: z.string().min(10).max(240),
  })
  .strict();
export const analysisSchema = z
  .object({ claims: z.array(claimSchema).max(6) })
  .strict();
export type SourceDocument = {
  source: Detail["sources"][number];
  text: string;
};
export const normalizedText = (s: string) => s.replace(/\s+/g, " ").trim();
export function mergeAnalysis(
  detail: Detail,
  documents: SourceDocument[],
  input: unknown,
): Detail {
  const { claims } = analysisSchema.parse(input),
    next = structuredClone(detail);
  const counts = new Map<string, number>();
  for (const c of claims) {
    counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1);
    if (counts.get(c.sourceId)! > 3)
      throw new Error("Too many excerpts from one source.");
    const doc = documents.find((d) => d.source.id === c.sourceId);
    if (
      !doc ||
      !normalizedText(doc.text).includes(normalizedText(c.excerpt)) ||
      !normalizedText(c.excerpt).includes(normalizedText(c.value))
    )
      throw new Error("AI claim is not supported by an exact source excerpt.");
  }
  for (const doc of documents)
    if (!next.sources.some((s) => s.id === doc.source.id))
      next.sources.push(doc.source);
  const groups = new Map<string, Detail["evidence"]>();
  for (const c of claims) {
    const eid =
      "web:" +
      createHash("sha256").update(JSON.stringify(c)).digest("hex").slice(0, 24);
    const e: Detail["evidence"][number] = {
      id: eid,
      establishmentId: detail.establishment.id,
      sourceId: c.sourceId,
      excerpt: c.excerpt,
      field: c.field,
      observedValue: c.value,
      scope: "local",
      assessment: "supports",
    };
    if (!next.evidence.some((x) => x.id === eid)) {
      next.evidence.push(e);
      next.establishment.evidenceIds.push(eid);
    }
    groups.set(c.field, [...(groups.get(c.field) ?? []), e]);
  }
  for (const [field, evidence] of groups) {
    // Existing human decisions and their evidence linkage are immutable on refresh.
    if (next.establishment.proposals.some((p) => p.field === field)) continue;
    const values = [...new Set(evidence.map((e) => e.observedValue))];
    next.establishment.proposals.push({
      id: `web-proposal:${detail.establishment.id}:${field}`,
      establishmentId: detail.establishment.id,
      field,
      before:
        detail.evidence.find((e) => e.field === field)?.observedValue ?? null,
      proposedValue: evidence[0].observedValue,
      reasonNl:
        values.length > 1
          ? "AI-voorstel: bronnen tonen verschillende vermeldingen. Vergelijk de bronfragmenten en pas aan vóór goedkeuring."
          : "AI-voorstel op basis van het bronfragment. Controleer de lokale toepasbaarheid vóór goedkeuring.",
      evidenceIds: evidence.map((e) => e.id),
      revision: 0,
      reviewState: "pending",
    });
  }
  if (claims.length) next.establishment.activityAssessment = "needs_check";
  return detailSchema.parse(next);
}

export const selectionSchema = z
  .object({
    claims: z
      .array(
        z
          .object({
            sourceId: z.string(),
            snippetIndex: z.number().int().nonnegative(),
            field: claimSchema.shape.field,
            value: z.string().min(1).max(200),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();
export function sourceSnippets(text: string) {
  const normalized = normalizedText(text),
    result: string[] = [];
  for (let i = 0; i < normalized.length; i += 160) {
    const s = normalized.slice(i, i + 240);
    if (s.length >= 10) result.push(s);
  }
  return result;
}
export function groundSelection(documents: SourceDocument[], input: unknown) {
  const parsed = selectionSchema.parse(input),
    seen = new Set<string>();
  return {
    claims: parsed.claims.flatMap((c) => {
      const doc = documents.find((d) => d.source.id === c.sourceId),
        excerpt = doc ? sourceSnippets(doc.text)[c.snippetIndex] : undefined;
      const unique = c.sourceId + ":" + c.field;
      if (
        !excerpt ||
        !normalizedText(excerpt).includes(normalizedText(c.value)) ||
        seen.has(unique)
      )
        return [];
      seen.add(unique);
      return [
        { sourceId: c.sourceId, field: c.field, value: c.value, excerpt },
      ];
    }),
  };
}
