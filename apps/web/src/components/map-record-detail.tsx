"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowLeft, MapPin } from "lucide-react";
import {detailSchema} from "@straatbeeld/contracts";
import {sourceDate,fieldLabel} from "@/lib/officer-data";
import { apiFetch } from "@/lib/api";
import { mapNl as t } from "@/lib/nl";
import { coordinateState, recordAddress, type MapEntry } from "@/lib/map-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MapRecordDetail({ entry, onClose }: { entry: MapEntry; onClose: () => void }) {
  const { record } = entry;
  const detail = useQuery({ queryKey: ["map-record", record.ondernemingsnr], queryFn: async ({ signal }) => detailSchema.parse(await (await apiFetch(`/api/establishments/${encodeURIComponent(record.ondernemingsnr)}`, { signal })).json()) });
  const dossier=detail.data;
  const evidence=dossier?.evidence.map(e=>({...e,source:dossier.sources.find(s=>s.id===e.sourceId)}))??[];
  const state = coordinateState(record);
  return <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card p-3"><Button variant="ghost" size="icon-sm" aria-label={t.allResults} onClick={onClose}><ArrowLeft className="size-4" /></Button><h2 className="text-sm font-semibold">{t.detail}</h2></div>
    <div className="space-y-5 p-4">
      <div className="space-y-2"><Badge variant="outline">{record.kind === "vestiging" ? t.establishment : t.entity}</Badge><h3 className="font-heading text-lg font-semibold leading-snug">{record.commercieleNaam || record.naam || t.noName}</h3><p className="flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{recordAddress(record) || t.unknown}</p>{state !== "valid" && <Badge variant="outline">{state === "missing" ? t.missing : t.suspect}</Badge>}</div>
      <dl className="space-y-3 text-xs"><div><dt className="text-muted-foreground">{t.number}</dt><dd className="mt-1 font-mono">{record.ondernemingsnr}</dd></div>
        {record.kind === "vestiging" && <div><dt className="text-muted-foreground">{t.parent}</dt><dd className="mt-1 font-mono">{record.zetelOndernemingsnr || t.unknown}</dd>{record.zetelElders && <dd className="mt-1 text-muted-foreground">{t.externalSeat}</dd>}</div>}
        {record.kind === "onderneming" && detail.data && <div><dt className="text-muted-foreground">{t.legalStatus}</dt><dd className="mt-1">{detail.data.establishment.registryStatus || t.unknown}</dd></div>}
      </dl>
      {detail.isPending ? <p role="status" className="text-xs text-muted-foreground">{t.loading}</p> : detail.isError ? <div role="alert" className="space-y-2"><p className="text-xs text-destructive">{t.detailError}</p><Button variant="outline" size="sm" onClick={() => void detail.refetch()}>{t.retry}</Button></div> : <>
        <div className="space-y-2 border-t pt-4"><span className="text-sm font-medium">Activiteitsbeeld</span><p className="text-xs">{{supported:"Onderbouwd",conflicting:"Tegenstrijdig bewijs",insufficient:"Onvoldoende bewijs",needs_check:"Te controleren"}[dossier!.establishment.activityAssessment]}</p><p className="text-xs">Maatschappelijke zetel: {dossier?.establishment.parent?.registeredAddress?`${dossier.establishment.parent.registeredAddress.street} ${dossier.establishment.parent.registeredAddress.houseNumber}, ${dossier.establishment.parent.registeredAddress.municipality}`:"Niet vastgesteld"}</p></div>
        <section className="space-y-3"><h4 className="text-sm font-semibold">{t.evidence}</h4>{!evidence.length&&<p className="text-xs">{t.noEvidence}</p>}{evidence.map(item=><div key={item.id} className="space-y-2 rounded-lg border p-3"><p className="text-xs leading-relaxed">{item.excerpt}</p><p className="text-[11px] text-muted-foreground">{item.source?.publisher} · {item.scope==="local"?"vestiging":item.scope==="enterprise"?"onderneming":"reikwijdte onbekend"} · opgehaald {item.source?sourceDate(item.source.retrievedAt):"onbekend"}</p>{item.source&&<a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-4">{t.source}<ArrowUpRight className="size-3"/></a>}</div>)}</section>
        {dossier?.establishment.proposals.map(p=><div key={p.id} className="space-y-2 rounded-lg bg-muted p-3"><h4 className="text-xs font-semibold">{fieldLabel(p.field)}</h4><p className="text-xs">{p.proposedValue} · {p.reviewState==="pending"?"Te beoordelen":p.reviewState==="approved"?"Bevestigd":"Afgewezen"}</p></div>)}
        <a href="/nazicht" className="text-sm underline">Naar nazicht</a>
      </>}
      <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">{t.overlapping} {t.noPublish}</p>
    </div>
  </div>;
}
