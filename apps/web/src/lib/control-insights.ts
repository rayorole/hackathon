import type { Detail } from "@straatbeeld/contracts";
import { normalizedField } from "./review-presentation";
export type PriorityReason = { code: "conflict" | "missing-evidence" | "nonlocal" | "stale" | "unknown-date"; evidenceIds: string[] };
export function controlPriority(detail: Detail, proposalId: string | undefined, now: string) {
  const proposal = detail.establishment.proposals.find(p => p.id === proposalId && p.reviewState === "pending");
  const reasons: PriorityReason[] = [];
  if (!proposal) return { level: "normal" as const, rank: 0, reasons };
  const evidence = detail.evidence.filter(e => proposal.evidenceIds.includes(e.id) || normalizedField(e.field) === normalizedField(proposal.field));
  const add = (code: PriorityReason["code"], ids: string[]) => reasons.push({ code, evidenceIds: ids });
  const conflicts = evidence.filter(e => e.assessment === "conflicts");
  if (conflicts.length) add("conflict", conflicts.map(e => e.id));
  if (!evidence.length) add("missing-evidence", []);
  else if (!evidence.some(e => e.scope === "local" && e.assessment === "supports")) add("nonlocal", evidence.map(e => e.id));
  const unknown: string[] = [], stale: string[] = [];
  for (const e of evidence) {
    const date = detail.sources.find(s => s.id === e.sourceId)?.observedAt;
    if (!date || !Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.parse(now)) unknown.push(e.id);
    else if (Date.parse(now) - Date.parse(date) > 180 * 86400000) stale.push(e.id);
  }
  if (stale.length) add("stale", stale);
  if (unknown.length) add("unknown-date", unknown);
  const rank = conflicts.length ? 3 : reasons.some(r => ["missing-evidence", "nonlocal", "stale"].includes(r.code)) ? 2 : reasons.length ? 1 : 0;
  return { level: rank === 3 ? "high" as const : rank ? "attention" as const : "normal" as const, rank, reasons };
}

/** Compare retained snapshots, never infer removal from absent extracted evidence. */
export function sourceChanges(detail: Detail) {
  const groups = new Map<string, Detail["sources"]>();
  for (const s of detail.sources) {
    const list = groups.get(s.url) ?? []; list.push(s); groups.set(s.url, list);
  }
  const changes: { field: string; scope: Detail["evidence"][number]["scope"]; before: string[]; after: string[]; previousSource: Detail["sources"][number]; source: Detail["sources"][number] }[] = [];
  for (const sources of groups.values()) {
    const sorted = [...sources].sort((a,b) => b.retrievedAt.localeCompare(a.retrievedAt));
    const source = sorted[0], previousSource = sorted.find(s => s.retrievedAt < source.retrievedAt);
    if (!previousSource) continue;
    const fields = new Set(detail.evidence.filter(e => e.sourceId === source.id).map(e => JSON.stringify([normalizedField(e.field), e.scope])));
    for (const key of fields) {
      const [field, scope] = JSON.parse(key) as [string, Detail["evidence"][number]["scope"]];
      const values = (id: string) => [...new Set(detail.evidence.filter(e => e.sourceId === id && normalizedField(e.field) === field && e.scope === scope && e.observedValue !== null).map(e => e.observedValue!))].sort();
      const before = values(previousSource.id), after = values(source.id);
      if (before.length && after.length && JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field, scope, before, after, source, previousSource });
    }
  }
  return changes;
}
