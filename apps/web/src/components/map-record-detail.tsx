"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowLeft, MapPin } from "lucide-react";
import { realDate } from "@kbo/core";
import { apiFetch } from "@/lib/api";
import { mapNl as t } from "@/lib/nl";
import { mapConfidence, coordinateState, displayObservationDate, mapDetailSchema, recordAddress, type MapEntry } from "@/lib/map-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MapRecordDetail({ entry, onClose }: { entry: MapEntry; onClose: () => void }) {
  const { record } = entry;
  const detail = useQuery({ queryKey: ["map-record", record.ondernemingsnr], queryFn: async ({ signal }) => mapDetailSchema.parse(await (await apiFetch(`/api/record/${encodeURIComponent(record.ondernemingsnr)}`, { signal })).json()) });
  const evidence = detail.data?.bewijs.filter(e => e.source.trim() && e.observation.trim() && e.sourceUrl && /^https?:\/\//.test(e.sourceUrl) && realDate(e.observedAt)) ?? [];
  const score = detail.data?.score;
  const state = coordinateState(record);
  return <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card p-3"><Button variant="ghost" size="icon-sm" aria-label={t.allResults} onClick={onClose}><ArrowLeft className="size-4" /></Button><h2 className="text-sm font-semibold">{t.detail}</h2></div>
    <div className="space-y-5 p-4">
      <div className="space-y-2"><Badge variant="outline">{record.kind === "vestiging" ? t.establishment : t.entity}</Badge><h3 className="font-heading text-lg font-semibold leading-snug">{record.commercieleNaam || record.naam || t.noName}</h3><p className="flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{recordAddress(record) || t.unknown}</p>{state !== "valid" && <Badge variant="outline">{state === "missing" ? t.missing : t.suspect}</Badge>}</div>
      <dl className="space-y-3 text-xs"><div><dt className="text-muted-foreground">{t.number}</dt><dd className="mt-1 font-mono">{record.ondernemingsnr}</dd></div>
        {record.kind === "vestiging" && <div><dt className="text-muted-foreground">{t.parent}</dt><dd className="mt-1 font-mono">{record.zetelOndernemingsnr || t.unknown}</dd>{record.zetelElders && <dd className="mt-1 text-muted-foreground">{t.externalSeat}</dd>}</div>}
        {record.kind === "onderneming" && detail.data && <div><dt className="text-muted-foreground">{t.legalStatus}</dt><dd className="mt-1">{detail.data.record.rechtstoestand || t.unknown}</dd></div>}
      </dl>
      {detail.isPending ? <p role="status" className="text-xs text-muted-foreground">{t.loading}</p> : detail.isError ? <div role="alert" className="space-y-2"><p className="text-xs text-destructive">{t.detailError}</p><Button variant="outline" size="sm" onClick={() => void detail.refetch()}>{t.retry}</Button></div> : <>
        <div className="space-y-2 border-t pt-4"><div className="flex items-center justify-between text-sm"><span className="font-medium">{t.confidence}</span><Badge variant="secondary">{mapConfidence(score ?? null) !== "unknown" && evidence.length ? score!.zekerheid : t.unassessed}</Badge></div><p className="text-xs text-muted-foreground">{t.lastSeen}: {displayObservationDate(evidence.map(e => e.observedAt).sort().at(-1) ?? null)}</p></div>
        {!!score?.redenen.length && <div><h4 className="mb-2 text-xs font-semibold">{t.reasons}</h4><ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">{score.redenen.map((reason,i) => <li key={i}>{reason.uitleg}<span className="block">{reason.bron} · {displayObservationDate(reason.waargenomenOp)} · {reason.punten > 0 ? "+" : ""}{reason.punten}</span>{reason.bronUrl && /^https?:\/\//.test(reason.bronUrl) && <a href={reason.bronUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t.source}</a>}</li>)}</ul></div>}
        <section className="space-y-3"><h4 className="text-sm font-semibold">{t.evidence}</h4>{!evidence.length && <p className="text-xs leading-relaxed text-muted-foreground">{t.noEvidence}</p>}{evidence.map((item,i) => <div key={i} className="space-y-2 rounded-lg border p-3"><p className="text-xs leading-relaxed">{item.observation}</p><p className="text-[11px] text-muted-foreground">{item.source} · {displayObservationDate(item.observedAt)}</p><a href={item.sourceUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-4">{t.source}<ArrowUpRight className="size-3" /></a></div>)}{detail.data && evidence.length < detail.data.bewijs.length && <p className="text-xs text-muted-foreground">{t.incompleteEvidence}</p>}</section>
        {score && <div className="space-y-2 rounded-lg bg-muted p-3"><h4 className="text-xs font-semibold">{t.proposal}</h4><p className="text-xs leading-relaxed">{score.voorstel}</p></div>}
      </>}
      <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">{t.overlapping} {t.noPublish}</p>
    </div>
  </div>;
}
