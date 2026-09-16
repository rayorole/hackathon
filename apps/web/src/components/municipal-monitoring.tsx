"use client";
import { useEffect, useState } from "react";
import { monitoringSchema, type Monitoring } from "@straatbeeld/contracts";
import { Pause, Play, ArrowRight, ChevronDown, Info } from "lucide-react";
import { useDesk } from "./desk-context";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from "./ui/popover";
function InfoHint({ label, children }: { label: string; children: string }) {
  return <Popover>
    <PopoverTrigger aria-label={`Uitleg: ${label}`} className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
      <Info aria-hidden="true" className="size-3.5" />
    </PopoverTrigger>
    <PopoverContent className="max-w-[calc(100vw-2rem)] gap-1.5 rounded-xl p-4" sideOffset={8}>
      <PopoverTitle className="text-sm font-medium">{label}</PopoverTitle>
      <PopoverDescription className="text-xs leading-relaxed">{children}</PopoverDescription>
    </PopoverContent>
  </Popover>;
}
const labels: Record<string, string> = {
  queued: "Wacht op onderzoek",
  running: "Wordt onderzocht",
  checked: "Bron bekeken",
  no_source: "Geen bron gevonden",
  failed: "Opnieuw proberen",
  budget_blocked: "Wacht op onderzoeksruimte",
};
export function MunicipalMonitoring({ compact = false }: { compact?: boolean }) {
  const desk = useDesk();
  const [filter, setFilter] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0);

  const [data, setData] = useState<Monitoring | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch("/api/monitoring", { cache: "no-store" });
        if (!r.ok)
          throw new Error("Onderzoeksstatus is tijdelijk niet beschikbaar.");
        const result = monitoringSchema.parse(await r.json());
        if (active) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Status niet beschikbaar");
      }
    }
    void load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function toggle() {
    if (!data) return;
    setBusy(true);
    try {
      const r = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !data.paused }),
      });
      if (!r.ok) throw new Error("Instelling kon niet worden opgeslagen.");
      setData({ ...data, paused: !data.paused });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }
  const jobs =
    data?.jobs.filter(
      (x) =>
        (!filter || x.status === filter) &&
        x.name
          .toLocaleLowerCase("nl-BE")
          .includes(query.toLocaleLowerCase("nl-BE")),
    ) ?? [];
  // Coverage groups are disjoint: a recheck never erases an earlier successful source check.
  const allJobs = data?.jobs ?? [];
  const viewed = allJobs.filter(job => job.checkedAt !== null).length;
  const noSource = allJobs.filter(job => job.checkedAt === null && job.status === "no_source").length;
  const remaining = allJobs.length - viewed - noSource;
  const status = error ? "Status niet beschikbaar" : !data ? "Status ophalen…" : data.paused ? "Onderzoek gepauzeerd" : data.online ? "Automatisch onderzoek actief" : "Onderzoek tijdelijk niet bereikbaar";
  const currentPage = Math.min(page, Math.max(0, Math.ceil(jobs.length / 10) - 1));
  const date = (value: string | null) => value ? new Date(value).toLocaleString("nl-BE", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "Nog niet gecontroleerd";
  const statusDot = <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${!error && data?.online && !data.paused ? "bg-primary" : "bg-muted-foreground"}`} />;
  if (compact) return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">{statusDot}{status}</span>
      <Button variant="ghost" size="sm" onClick={() => desk.navigate("research")}>Onderzoek bekijken<ArrowRight className="size-4" /></Button>
    </div>
  );
  return (
    <section className="space-y-5" aria-label="Gemeentelijk onderzoek">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">{statusDot}{status}</p>
          <p className="mt-2 text-sm text-muted-foreground">Eerst zoeken we een bron bij een zaak. Pas als die gevonden is, kan AI de inhoud bekijken.</p>
        </div>
        <Button variant="outline" size="sm" disabled={busy || !data?.total} onClick={toggle}>
          {data?.paused ? <Play className="size-4" /> : <Pause className="size-4" />}{data?.paused ? "Hervatten" : "Pauzeren"}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="py-12 text-center text-sm text-muted-foreground">Wachtrij ophalen…</p>}
      {data && <>
        <div className="surface-panel overflow-hidden">
          <div className="border-b px-5 py-4">
            <p className="text-sm font-medium">Van {allJobs.length} zaken hebben we bij {viewed} een bron bekeken.</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.researchStarted} AI-analyses gestart binnen het automatische onderzoek.<InfoHint label="AI-analyses">Dit telt gestarte inhoudelijke analyses, niet alle zaken waarvoor we een bron zochten. Een hercontrole kan dezelfde zaak opnieuw tellen. Eerdere losse ontwikkeltests tellen hier niet mee.</InfoHint></p>
          </div>
          <dl className="grid grid-cols-1 border-b sm:grid-cols-3">
            {[
              {value: viewed, label: "Bron bekeken", note: "Inhoud kunnen onderzoeken", help: "Bij deze zaken konden we minstens één bron bekijken. Dit betekent niet dat alle gegevens bevestigd zijn. Eerder bekeken bronnen blijven meetellen tijdens een hercontrole."},
              {value: noSource, label: "Geen bron gevonden", note: "Nog geen inhoud onderzocht", help: "Wel naar een bron gezocht, maar geen duidelijke match gevonden in onze aangesloten bronnen. Geen bewijs van sluiting."},
              {value: remaining, label: "Nog te onderzoeken", note: "Wacht, bezig of opnieuw proberen", help: "Nog geen broncheck afgerond. Hieronder vallen ook controles die mislukten of op budget wachten. De status bij de zaak legt uit waarom."},
            ].map(({value,label,note,help}) => (
              <div key={label} className="px-5 py-4"><dt className="flex items-center gap-1 text-xs text-muted-foreground">{label}<InfoHint label={label}>{help}</InfoHint></dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3 border-b p-4">
            <Input aria-label="Zoek in onderzoekswachtrij" placeholder="Zoek een zaak…" value={query} onChange={(e)=>{setQuery(e.target.value);setPage(0);}} className="min-w-0 flex-1 sm:max-w-sm" />
            <select aria-label="Onderzoeksstatus" value={filter} onChange={(e)=>{setFilter(e.target.value);setPage(0);}} className="h-9 rounded-lg border bg-background px-3 text-sm">
              <option value="">Alle statussen</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Zaak</th><th className="px-4 py-3 font-medium"><span className="inline-flex items-center gap-1">Onderzoeksstatus<InfoHint label="Onderzoeksstatus">Waar de automatische controle staat. Klik op een status in de tabel voor de uitleg bij die zaak.</InfoHint></span></th><th className="hidden px-4 py-3 font-medium md:table-cell"><span className="inline-flex items-center gap-1">Laatste broncheck<InfoHint label="Laatste broncheck">Wanneer we voor het laatst een openbare bron bij deze zaak konden bekijken. Dit is niet de datum waarop een medewerker de gegevens heeft goedgekeurd.</InfoHint></span></th><th className="w-10"><span className="sr-only">Dossier</span></th></tr></thead>
              <tbody className="divide-y">
                {jobs.slice(currentPage*10,currentPage*10+10).map(x=><tr key={x.id} className="group hover:bg-muted/20">
                  <td className="px-5 py-3"><button className="text-left font-medium hover:text-primary hover:underline" onClick={()=>{const row=desk.records.find(r=>r.id===x.id);if(row)desk.openRecord(row,"street");}}>{x.name}</button></td>
                  <td className="px-4 py-3"><details className="max-w-xs"><summary className="flex cursor-pointer items-center gap-2 text-xs"><span className={`inline-flex rounded-md px-2 py-1 ${x.status === "checked" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{labels[x.status] ?? x.status}</span><ChevronDown className="size-3 text-muted-foreground" /></summary><p className="pt-2 text-xs leading-relaxed text-muted-foreground">{x.message ?? "Wacht op de volgende onderzoeksronde."}</p></details></td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{date(x.checkedAt)}</td>
                  <td className="pr-4"><button aria-label={`Open dossier van ${x.name}`} className="rounded-md p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" onClick={()=>{const row=desk.records.find(r=>r.id===x.id);if(row)desk.openRecord(row,"street");}}><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" /></button></td>
                </tr>)}
              </tbody>
            </table>
            {!jobs.length && <p className="p-10 text-center text-sm text-muted-foreground">Geen zaken gevonden voor deze zoekopdracht.</p>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground"><span>{jobs.length} {jobs.length === 1 ? "zaak" : "zaken"} · {currentPage+1} / {Math.max(1,Math.ceil(jobs.length/10))}</span><div className="flex gap-2"><Button variant="ghost" size="sm" disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>Vorige</Button><Button variant="ghost" size="sm" disabled={(currentPage+1)*10>=jobs.length} onClick={()=>setPage(currentPage+1)}>Volgende</Button></div></div>
        </div>
        {!!(data.failed + data.blocked) && <p className="text-sm text-muted-foreground">{data.failed} onderzoeken worden opnieuw geprobeerd; {data.blocked} wachten op onderzoeksruimte. Bekijk ze via het statusfilter.</p>}
        <details className="rounded-xl border bg-background px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium">Planning en reikwijdte</summary>
          <div className="mt-4 grid gap-5 text-sm md:grid-cols-2">
            <div><h3 className="font-medium">Automatische controles</h3><p className="mt-2 leading-relaxed text-muted-foreground">De wachtrij wordt elke minuut verwerkt. Bronnen worden na 7 dagen opnieuw gecontroleerd; zonder passende bron proberen we na 30 dagen opnieuw.</p><p className="mt-2 text-xs text-muted-foreground">Laatste planning: {date(data.lastPlannedAt)}</p></div>
            <div><h3 className="font-medium">Wat deze cijfers betekenen</h3><p className="mt-2 leading-relaxed text-muted-foreground">Dit is een gedeeltelijke KBO-selectie. Een broncontrole bewijst niet dat een zaak actief is; geen bron vinden betekent niet dat ze gesloten is. Alleen u keurt wijzigingen goed.</p><p className="mt-2 text-xs text-muted-foreground">Handelaarsgids: {data.directoryCandidates} vermeldingen, niet automatisch toegevoegd. Onderzoeksruimte: {data.researchStarted} van {data.researchLimit} analyses; gedeeld AI-budget maximaal $10.</p></div>
          </div>
        </details>
      </>}
    </section>
  );
}
