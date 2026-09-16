"use client";
import { DeskEmpty } from "./desk-empty";
import { emptyNl } from "@/lib/nl";

import type { Detail } from "@straatbeeld/contracts";
import { ExternalLink, FileText } from "lucide-react";
import { evidenceGroups, normalizedField } from "@/lib/review-presentation";
import { fieldLabel, sourceDate } from "@/lib/officer-data";
import { sourcesNl as t, presentationNl, uxNl } from "@/lib/nl";
import { FieldValue } from "./data-display";

export function BusinessSources({ detail }: { detail: Detail }) {
  const evidence = evidenceGroups(detail);
  return (
    <div className="business-sources">
      {detail.sources.map((source) => {
        const items = evidence.filter((item) => item.source?.id === source.id);
        return (
          <article className="business-source" key={source.id}>
            <header className="business-source-header">
              <span className="source-symbol"><FileText aria-hidden className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{source.publisher.split(" — ")[0]}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.kinds[source.kind]} · {items.length} {t.observations}</p>
              </div>
              <a href={source.url} target="_blank" rel="noreferrer" className="business-source-link">
                {t.open}<ExternalLink aria-hidden className="size-3.5" />
              </a>
            </header>
            <dl className="business-source-facts">
              {items.map((item) => {
                const field = normalizedField(item.field);
                const label = t.fields[field as keyof typeof t.fields] ?? fieldLabel(item.field);
                const isDate = field === "registrationdate" || field === "startdate";
                return (
                  <div className="business-source-fact" key={item.evidenceIds.join(",")}>
                    <dt>{label}<span>{item.scope === "local" ? presentationNl.local : item.scope === "enterprise" ? presentationNl.enterprise : presentationNl.sourceUnknown}</span></dt>
                    <dd>
                      {isDate ? <p className="font-medium">{item.value && !["1900-01-01", "9999-12-31"].includes(item.value.slice(0, 10)) ? sourceDate(item.value) : uxNl.unknown}</p> : <FieldValue field={item.field} value={item.value || item.excerpt} />}
                      {item.assessment === "conflicts" && <p className="mt-2 text-xs font-medium text-warning">{uxNl.conflict}</p>}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {!items.length && <p className="px-5 py-4 text-sm text-muted-foreground">{t.noObservations}</p>}
            <footer className="business-source-meta">
              <span>{t.retrieved}: <strong>{sourceDate(source.retrievedAt)}</strong></span>
              <span>{t.observed}: <strong>{source.observedAt ? sourceDate(source.observedAt) : uxNl.unknown}</strong></span>
              {source.registrySnapshotDate && <span>{presentationNl.snapshot}: <strong>{sourceDate(source.registrySnapshotDate)}</strong></span>}
              {source.isDemo && <span>{t.demo}</span>}
            </footer>
          </article>
        );
      })}
      {!detail.sources.length && <DeskEmpty icon={<FileText />} title={t.empty} description={emptyNl.businessSourcesNote} />}
    </div>
  );
}
