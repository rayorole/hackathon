import { acceptedFields, type Detail } from "@straatbeeld/contracts";

export const normalizedField = (field: string) =>
  field
    .replace(/_/g, "")
    .toLowerCase()
    .replace(/^phone$/, "telephone");
export function matchesBusiness(detail: Detail, query: string) {
  const e = detail.establishment;
  const q = query.trim().toLocaleLowerCase("nl-BE");
  const digits = q.replace(/[.\s-]/g, "");
  return (
    !q ||
    [
      e.name,
      e.address.street + " " + e.address.houseNumber,
      e.address.municipality,
    ]
      .join(" ")
      .toLocaleLowerCase("nl-BE")
      .includes(q) ||
    (/^\d+$/.test(digits) &&
      [e.id, e.parentEnterpriseId].some((id) => id?.includes(digits)))
  );
}
export function evidenceGroups(detail: Detail, ids?: string[]) {
  const groups = new Map<
    string,
    {
      evidenceIds: string[];
      excerpt: string;
      field: string;
      value: string | null;
      scope: Detail["evidence"][number]["scope"];
      assessment: Detail["evidence"][number]["assessment"];
      source: Detail["sources"][number] | undefined;
    }
  >();
  for (const e of detail.evidence) {
    if (ids && !ids.includes(e.id)) continue;
    const key = JSON.stringify([
      e.sourceId,
      e.excerpt,
      e.field,
      e.scope,
      e.assessment,
    ]);
    const old = groups.get(key);
    if (old) old.evidenceIds.push(e.id);
    else
      groups.set(key, {
        evidenceIds: [e.id],
        excerpt: e.excerpt,
        field: e.field,
        value: e.observedValue,
        scope: e.scope,
        assessment: e.assessment,
        source: detail.sources.find((s) => s.id === e.sourceId),
      });
  }
  return [...groups.values()];
}
export function proposalPresentation(detail: Detail, proposalId: string) {
  const proposal = detail.establishment.proposals.find(
    (p) => p.id === proposalId,
  );
  if (!proposal) return null;
  const relevant = detail.evidence.filter(
    (e) =>
      proposal.evidenceIds.includes(e.id) ||
      normalizedField(e.field) === normalizedField(proposal.field),
  );
  const grouped = evidenceGroups(
    detail,
    relevant.map((e) => e.id),
  );
  // Collapse repeat fetches only in the decision view. Full source history stays in evidenceGroups(detail).
  const unique = new Map<string, (typeof grouped)[number]>();
  for (const item of grouped) {
    const key = JSON.stringify([
      item.source?.url,
      item.source?.publisher,
      item.source?.observedAt,
      item.excerpt,
      item.field,
      item.value,
      item.scope,
      item.assessment,
    ]);
    const previous = unique.get(key);
    if (!previous)
      unique.set(key, { ...item, evidenceIds: [...item.evidenceIds] });
    else {
      previous.evidenceIds.push(...item.evidenceIds);
      if (
        item.source &&
        (!previous.source ||
          item.source.retrievedAt > previous.source.retrievedAt)
      )
        previous.source = item.source;
    }
  }
  const evidence = [...unique.values()];
  const latest = detail.reviews.findLast((r) => r.proposalId === proposal.id);
  return {
    proposal,
    evidence,
    latest,
    compareSources:
      new Set(evidence.map((e) => e.source?.url).filter(Boolean)).size > 1,
    hasConflict: relevant.some((e) => e.assessment === "conflicts"),
    needsLocalCheck:
      relevant.length === 0 || !relevant.some((e) => e.scope === "local"),
    approvedValue:
      latest?.decision === "approve" && proposal.reviewState === "approved"
        ? latest.effectiveValue
        : null,
  };
}
export function approvedChanges(details: Detail[], street = "") {
  return details
    .filter((d) => !street || d.establishment.address.street === street)
    .flatMap((detail) =>
      acceptedFields(detail).map(({ proposal, review }) => ({
        detail,
        proposal,
        review,
      })),
    );
}
