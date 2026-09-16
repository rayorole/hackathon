"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { aiNl as t } from "@/lib/nl";
import { readResearch, type ResearchRun } from "@/lib/assistant-transport";
import { ResearchReport } from "./research-report";
import { EvidenceChat } from "./evidence-chat";

export function RecordResearch({ nr, name }: { nr: string; name: string }) {
  const [open, setOpen] = useState(false);
  return <><Button className="w-full" variant="secondary" onClick={() => setOpen(true)}><Sparkles />{t.open}</Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b pr-14"><SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />{t.title}</SheetTitle><SheetDescription>{t.subtitle}</SheetDescription><div className="mt-2"><p className="font-semibold">{name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{nr}</p></div></SheetHeader>
        {open && <ResearchBody key={nr} nr={nr} />}
      </SheetContent>
    </Sheet>
  </>;
}

function ResearchBody({ nr }: { nr: string }) {
  const client = useQueryClient();
  const queryKey = ["record-research", nr];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => readResearch(nr, { signal }), refetchInterval: query => query.state.data?.status === "running" ? 5000 : false });
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = query.data;
  const running = working || run?.status === "running";
  const update = (next: ResearchRun | null) => { client.setQueryData(queryKey, next); void client.invalidateQueries({ queryKey: ["map-record", nr] }); };
  async function research(refresh: boolean) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setWorking(true); setFailed(false); setInterrupted(false);
    try {
      await client.cancelQueries({ queryKey });
      update(await readResearch(nr, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(150_000)]) }));
    } catch { if (abort.signal.aborted) setInterrupted(true); else setFailed(true); }
    finally { controller.current = null; setWorking(false); void query.refetch(); }
  }
  async function reload() { const refreshed = await query.refetch(); if (!refreshed.isError) setInterrupted(false); return !refreshed.isError; }
  return <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
    {query.isPending && <p role="status" className="text-sm text-muted-foreground">{t.loading}</p>}
    {query.isError && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{t.loadFailed}</p><Button variant="outline" onClick={() => void reload()}>{t.retry}</Button></div>}
    {!query.isPending && !query.isError && !run && !working && <div className="space-y-4 rounded-xl border border-dashed p-5"><Search className="size-7 text-primary" /><p className="text-sm leading-relaxed text-muted-foreground">{t.intro}</p><Button onClick={() => void research(false)}><Search />{t.start}</Button></div>}
    {running && <div role="status" className="space-y-3 rounded-xl border bg-muted/50 p-4"><div className="flex items-center gap-2 font-medium"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />{t.searching}</div><p className="text-xs leading-relaxed text-muted-foreground">{t.searchingNote}</p>{working && <Button size="sm" variant="outline" onClick={() => controller.current?.abort()}>{t.stopWaiting}</Button>}</div>}
    {interrupted && <div role="status" className="space-y-2"><p className="text-xs text-muted-foreground">{t.interrupted}</p><Button size="sm" variant="outline" onClick={() => void reload()}>{t.reload}</Button></div>}
    {(failed || run?.status === "failed") && <div role="alert" className="space-y-3 rounded-xl border p-4"><p className="text-sm text-destructive">{t.failed}</p><Button disabled={running} variant="outline" onClick={() => void research(true)}>{t.retry}</Button></div>}
    {run?.status === "completed" && run.result && <>
      <div className="flex items-center justify-between gap-2"><Badge variant="secondary">{t.aiLabel}</Badge><Button variant="outline" size="sm" disabled={running} onClick={() => void research(true)}><RefreshCw />{t.refresh}</Button></div>
      {!working && <ResearchReport key={run.id} run={run} onDecision={update} onReload={reload} />}
      {!working && <EvidenceChat key={run.id} nr={nr} runId={run.id} />}
    </>}
    <p className="border-t pt-4 text-xs text-muted-foreground">{t.noPublication}</p>
  </div>;
}
