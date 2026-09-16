"use client";

import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Check, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { aiNl as t } from "@/lib/nl";
import { displayObservationDate } from "@/lib/map-data";
import { decideResearch, type ResearchRun } from "@/lib/assistant-transport";

export function ResearchReport({ run, onDecision, onReload }: { run: ResearchRun; onDecision: (run: ResearchRun) => void; onReload: () => Promise<boolean> }) {
  const result = run.result!;
  const [value, setValue] = useState(run.decision?.value ?? result.proposal.value ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const decisionAttempt = useRef<{ signature: string; key: string } | null>(null);
  const counts = (["bevestigt", "weerlegt", "neutraal"] as const).map(direction => ({
    name: t.directions[direction], count: result.findings.filter(finding => finding.direction === direction).length,
  }));
  const canConfirm = result.proposal.kind !== "correctie" || value.trim().length > 0;
  async function decide(beoordeling: "bevestigd" | "afgewezen") {
    if (pending.current) return;
    pending.current = true; setSaving(true); setFailed(false);
    const decisionValue = result.proposal.kind === "correctie" ? value.trim() : null;
    const signature = JSON.stringify([run.id, beoordeling, decisionValue]);
    if (decisionAttempt.current?.signature !== signature) decisionAttempt.current = { signature, key: crypto.randomUUID() };
    try {
      onDecision(await decideResearch(run.ondernemingsnr, run.id, { beoordeling, value: decisionValue, idempotencyKey: decisionAttempt.current.key }));
    } catch { setFailed(true); }
    finally { pending.current = false; setSaving(false); }
  }
  return <div className="space-y-6">
    <section className="space-y-2"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="font-semibold">{t.summary}</h3></div><p className="text-sm leading-relaxed">{result.summary}</p><p className="text-xs text-muted-foreground">{t.aiLabel} · {displayObservationDate(run.createdAt.slice(0, 10))}</p></section>
    {!!result.findings.length && <section className="rounded-xl border p-4"><h3 className="text-sm font-semibold">{t.counts}</h3>
      <ChartContainer config={{ count: { label: t.count, color: "var(--primary)" } }} className="mt-3 h-40 w-full" aria-label={counts.map(item => `${item.name}: ${item.count}`).join(", ")}>
        <BarChart data={counts} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={24} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
      </ChartContainer><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.countsNote}</p></section>}
    <section className="space-y-3"><h3 className="font-semibold">{t.evidence}</h3>
      {!result.findings.length && <p className="rounded-xl bg-muted p-4 text-sm leading-relaxed">{t.noEvidence}</p>}
      {result.findings.map((finding, index) => <article key={`${finding.sourceId}-${index}`} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2"><Badge variant="secondary">{t.directions[finding.direction]}</Badge><Badge variant="outline">{t.scopes[finding.scope]}</Badge></div>
        <p className="text-sm leading-relaxed">{finding.observation}</p>
        <blockquote aria-label={t.quote} className="border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-muted-foreground">“{finding.quote}”</blockquote>
        <div className="space-y-1 text-xs text-muted-foreground"><a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 break-all font-medium text-foreground underline underline-offset-4">{finding.source}<ArrowUpRight className="size-3 shrink-0" /><span className="sr-only">{t.source}</span></a><p>{t.observed}: {displayObservationDate(finding.observedAt)}</p></div>
      </article>)}
      {!!result.findings.length && <p className="text-xs leading-relaxed text-muted-foreground">{t.dateNote}</p>}
    </section>
    {!!result.uncertainties.length && <section className="space-y-2 rounded-xl bg-muted p-4"><h3 className="text-sm font-semibold">{t.uncertainties}</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed">{result.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
    <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{t.proposal}</h3><Badge variant="outline">{t.kinds[result.proposal.kind]}</Badge></div>
      <p className="text-sm leading-relaxed">{result.proposal.reason}</p>
      {result.proposal.kind === "correctie" && result.proposal.field && <div className="space-y-2"><label htmlFor={`proposal-${run.id}`} className="text-xs font-medium">{t.fields[result.proposal.field]} · {t.proposedValue}</label><Input id={`proposal-${run.id}`} value={value} disabled={saving || !!run.decision || failed} onChange={event => setValue(event.target.value)} /></div>}
      <p className="text-xs leading-relaxed text-muted-foreground">{t.approval}</p>
      {run.decision ? <p role="status" className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4" />{run.decision.beoordeling === "bevestigd" ? t.confirmed : t.rejected} · {displayObservationDate(run.decision.beslistOp.slice(0, 10))}</p> : <div className="flex flex-wrap gap-2"><Button size="sm" disabled={saving || failed || !canConfirm} onClick={() => void decide("bevestigd")}><Check />{t.confirm}</Button><Button size="sm" variant="outline" disabled={saving || failed} onClick={() => void decide("afgewezen")}><X />{t.reject}</Button></div>}
      {saving && <p role="status" className="text-xs">{t.saving}</p>}
      {failed && <div role="alert" className="space-y-2"><p className="text-xs text-destructive">{t.saveFailed}</p><Button variant="outline" size="sm" onClick={() => void onReload().then(success => { if (success) setFailed(false); })}>{t.reload}</Button></div>}
    </section>
    {!!result.sources.length && <section className="space-y-2"><h3 className="text-sm font-semibold">{t.sources}</h3>{result.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2 rounded-lg border p-3 text-xs hover:bg-muted"><span className="min-w-0"><span className="block font-medium">{source.title}</span><span className="mt-1 block break-all text-muted-foreground">{source.url}</span></span><ArrowUpRight className="size-3 shrink-0" /></a>)}</section>}
  </div>;
}
