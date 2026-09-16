"use client";
import type { Detail } from "@straatbeeld/contracts";
import { ArrowRight, AlertTriangle, ExternalLink } from "lucide-react";
import { controlPriority, sourceChanges } from "@/lib/control-insights";
import { controlNl as t } from "@/lib/nl";
import { fieldLabel, sourceDate } from "@/lib/officer-data";
import { FieldValue } from "./data-display";
import { Disclosure } from "./business-detail";
export function PrioritySummary({ detail, proposalId, expanded = false }: { detail: Detail; proposalId?: string; expanded?: boolean }) {
  const priority = controlPriority(detail, proposalId, new Date().toISOString());
  if (!priority.reasons.length) return null;
  return (
    <div className={expanded ? "priority-explanation" : "priority-summary"}>
      <span className={`priority-label priority-${priority.level}`}><AlertTriangle aria-hidden className="size-3.5" />{t.levels[priority.level]}</span>
      <span className="text-xs text-muted-foreground">{priority.reasons.map(r => t.reasons[r.code]).join(" · ")}</span>
    </div>
  );
}
export function SourceChanges({ detail }: { detail: Detail }) {
  const changes = sourceChanges(detail);
  if (!changes.length) return null;
  return (
    <Disclosure title={`${t.changes} (${changes.length})`}>
      <p className="text-xs text-muted-foreground">{changes.length ? t.changesNote : t.noChangesNote}</p>
      {changes.map((change) => (
        <article key={`${change.source.id}:${change.field}:${change.scope}`} className="source-change-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div><h3 className="text-sm font-semibold">{fieldLabel(change.field)}</h3><p className="mt-1 text-xs text-muted-foreground">{change.source.publisher} · {change.scope === "local" ? t.local : change.scope === "enterprise" ? t.enterprise : t.unknownScope}</p></div>
            <a href={change.source.url} target="_blank" rel="noreferrer" className="business-source-link">{t.source}<ExternalLink className="size-3.5" /></a>
          </header>
          <div className="source-change-values">
            <div><p className="mb-3 text-xs text-muted-foreground">{t.previous} · {sourceDate(change.previousSource.retrievedAt)}</p>{change.before.map(v => <FieldValue key={v} field={change.field} value={v} />)}</div>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <div><p className="mb-3 text-xs text-muted-foreground">{t.latest} · {sourceDate(change.source.retrievedAt)}</p>{change.after.map(v => <FieldValue key={v} field={change.field} value={v} />)}</div>
          </div>
        </article>
      ))}
    </Disclosure>
  );
}
