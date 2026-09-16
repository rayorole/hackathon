import {
  DataError,
  reviewRequestSchema,
  type Detail,
  type Review,
  type ReviewRequest,
  type Filters,
  matches,
} from "./index";
// Pure transition used by the fixture adapter and server. Database compare-and-swap is still required.
export function applyReview(
  detail: Detail,
  input: ReviewRequest,
  reviewId: string,
  now: string,
): { detail: Detail; review: Review } {
  const request = reviewRequestSchema.parse(input),
    next = structuredClone(detail),
    p = next.establishment.proposals.find((p) => p.id === request.proposalId);
  if (!p) throw new DataError("NOT_FOUND", "Voorstel niet gevonden.", 404);
  if (p.revision !== request.expectedRevision)
    throw new DataError(
      "REVISION_CONFLICT",
      "Dit voorstel is gewijzigd. Laad het opnieuw.",
      409,
    );
  if (request.decision === "approve" && !p.evidenceIds.length)
    throw new DataError("NO_EVIDENCE", "Voeg eerst bewijs toe.", 422);
  const review: Review = {
    reviewId,
    proposalId: p.id,
    decision: request.decision,
    effectiveValue:
      request.decision === "approve"
        ? request.correctedValue !== undefined
          ? request.correctedValue
          : p.proposedValue
        : null,
    reviewedAt: now,
    revision: p.revision + 1,
    note: request.note ?? null,
  };
  p.revision = review.revision;
  p.reviewState = request.decision === "approve" ? "approved" : "rejected";
  next.reviews.push(review);
  return { detail: next, review };
}
function cell(value: string) {
  const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function approvedCsv(details: Detail[], filters: Filters = {}): string {
  const rows = [
    [
      "establishment_id",
      "name",
      "field",
      "approved_value",
      "reviewed_at",
      "source_urls",
      "demo",
    ],
  ];
  for (const d of details.filter((d) => matches(d.establishment, filters)))
    for (const p of d.establishment.proposals) {
      if (p.reviewState !== "approved") continue;
      const review = d.reviews.findLast((r) => r.proposalId === p.id);
      if (!review || review.decision !== "approve") continue;
      const ids = d.evidence
        .filter((e) => p.evidenceIds.includes(e.id))
        .map((e) => e.sourceId);
      rows.push([
        d.establishment.id,
        d.establishment.name,
        p.field,
        review.effectiveValue ?? "",
        review.reviewedAt,
        d.sources
          .filter((s) => ids.includes(s.id))
          .map((s) => s.url)
          .join(" "),
        String(d.establishment.isDemo),
      ]);
    }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
