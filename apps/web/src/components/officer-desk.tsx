"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Search, ArrowRight, MapPin, Download, ShieldCheck, ClipboardCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { deskRoutes } from "@/lib/desk-routes";
import { OfficerSidebar } from "@/components/officer-sidebar";
import { DeskDataTable, type DeskColumn } from "@/components/desk-data-table";
import { demoRecords, type DemoRecord } from "@/lib/officer-demo";
import { deskNl as t, nl, deskSources, mapNl } from "@/lib/nl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type Screen = keyof typeof t.nav;
type Decision = "Bevestigd" | "Afgewezen";
type Entry = {
  id: number;
  when: string;
  record: DemoRecord;
  status: Decision;
  reason: string;
  who: string;
};
const panel = "rounded-xl border shadow-xs ring-0 gap-0 py-0 overflow-hidden";
const tones = {
  Hoog: "border-primary/20 bg-primary/5 text-primary",
  Middel: "border-warning/25 bg-warning/10 text-warning",
  Laag: "border-border bg-muted text-muted-foreground",
};
function Confidence({ value }: { value: DemoRecord["zekerheid"] }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md text-[11px] font-medium", tones[value])}
    >
      {value}
    </Badge>
  );
}
function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className={panel}>
      {title && (
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
function Nothing({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Panel>
      <div className="grid justify-items-center gap-3 px-6 py-10 text-center">
        <Search className="size-5 text-muted-foreground" />
        <h3 className="font-heading font-semibold">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </Panel>
  );
}

function useDeskState(officer: string) {
  const pathname = usePathname();
  const router = useRouter();
  const screen =
    (Object.keys(deskRoutes) as Screen[]).find(
      (key) => deskRoutes[key] === pathname,
    ) ?? "overview";
  const setScreen = (next: Screen) => {
    if (deskRoutes[next] !== pathname) router.push(deskRoutes[next]);
  };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoRecord | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [history, setHistory] = useState<Entry[]>([]);
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [state, setState] = useState("loading");
  const rows = demoRecords.filter((r) =>
    (r.adres + " " + r.naam + " " + r.ondNr + " " + r.vestNr)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const queue = demoRecords.filter(
    (r) => r.voorstel !== "Geen actie" && !decisions[r.adres],
  );
  const streets = [
    ...new Set(demoRecords.map((r) => r.adres.replace(/ \d+$/, ""))),
  ]
    .map((name) => ({
      name,
      records: demoRecords.filter((r) => r.adres.startsWith(name)).length,
      open: queue.filter((r) => r.adres.startsWith(name)).length,
    }))
    .sort((a, b) => b.open - a.open);
  function openRecord(record: DemoRecord) {
    setSelected(record);
  }
  function ask(record: DemoRecord, status: Decision) {
    setSelected(record);
    setReason("");
    setDialog(status);
  }
  function decide() {
    if (!selected || !dialog || decisions[selected.adres] || selected.voorstel === "Geen actie") return;
    const entry: Entry = {
      id: Date.now(),
      when: new Date().toLocaleString("nl-BE"),
      record: structuredClone(selected),
      status: dialog,
      reason: reason.trim(),
      who: officer,
    };
    setHistory((h) => [entry, ...h]);
    setDecisions((d) => ({ ...d, [selected.adres]: dialog }));
    setDialog(null);
  }
  function exportHistory() {
    const escape = (value: string) =>
      '"' + value.replace(/^[=+\-@]/, "'$&").replaceAll('"', '""') + '"';
    const data = [
      [t.time, t.record, t.change, t.source, t.employee, t.status, t.reason],
      ...history.map((e) => [
        e.when,
        e.record.vestNr,
        e.record.voorstel,
        e.record.bewijs.map((b) => b.bron).join("; "),
        e.who,
        e.status,
        e.reason,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["﻿" + data.map((row) => row.map(escape).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "demonstratie-historiek.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const details = selected && (
    <Panel>
      <div className="border-b p-4">
        <p className="text-xs text-muted-foreground">{selected.adres}</p>
        <h3 className="mt-1 font-heading text-lg font-semibold">
          {selected.naam}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{selected.soort}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t.columns[2]}:</span>
          <Badge
            variant={
              selected.register === "Ontbreekt" ? "destructive" : "outline"
            }
            className="rounded-md"
          >
            {selected.register}
          </Badge>
          <span className="ml-2 text-xs text-muted-foreground">{t.certainty}:</span>
          <Confidence value={selected.zekerheid} />
        </div>
      </div>
      <div className="space-y-3 border-b p-4">
        <h4 className="text-xs font-medium text-muted-foreground">
          {t.columns[3]}
        </h4>
        {selected.bewijs.map((b, i) => (
          <div key={i} className="border-l-2 border-primary/20 pl-3">
            <p className="text-sm">{b.waarneming}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.bron} · {b.datum}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.placeholderSource}
            </p>
          </div>
        ))}
      </div>
      <Accordion className="rounded-none border-x-0 border-t-0">
        <AccordionItem value="register"><AccordionTrigger>{t.registrationDetails}</AccordionTrigger><AccordionContent>
      <div className="space-y-3">
        {[
          [t.establishment, selected.vestNr],
          [t.enterprise, selected.ondNr],
          [t.seat, selected.zetel],
          [t.legal, selected.rechtstoestand],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-xs">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="text-right tabular-nums">{value}</span>
          </div>
        ))}
      </div>
        </AccordionContent></AccordionItem>
        <AccordionItem value="contact"><AccordionTrigger>{t.contactDetails}</AccordionTrigger><AccordionContent>
      <div>
        <p className="text-sm">{selected.contact}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selected.contactNiveau} · {selected.contactBron}
        </p>
      </div>
        </AccordionContent></AccordionItem>
      </Accordion>
      <div className="bg-muted/60 p-4">
        <h4 className="mb-2 text-xs text-muted-foreground">{t.proposal}</h4>
        <p className="text-sm">{selected.voorstelLang}</p>
        {!decisions[selected.adres] && selected.voorstel !== "Geen actie" && <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => ask(selected, "Bevestigd")}>
            {t.confirm}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => ask(selected, "Afgewezen")}
          >
            {t.reject}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
            {t.later}
          </Button>
        </div>}
        <p className="mt-3 text-xs text-muted-foreground">
          {decisions[selected.adres] ? `${decisions[selected.adres]}. ${t.decisionSaved}` : selected.voorstel === "Geen actie" ? t.noAction : t.pending}
        </p>
        {decisions[selected.adres] && <Button className="mt-3" variant="outline" onClick={() => { setSelected(null); setScreen("history"); }}>{t.viewHistory}</Button>}
      </div>
    </Panel>
  );

  return {
    screen,
    setScreen,
    query,
    setQuery,
    selected,
    setSelected,
    decisions,
    history,
    dialog,
    setDialog,
    reason,
    setReason,
    state,
    setState,
    rows,
    queue,
    streets,
    openRecord,
    ask,
    decide,
    exportHistory,
    details,
  };
}

const DeskContext = createContext<ReturnType<typeof useDeskState> | null>(null);
function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error("Missing desk provider");
  return value;
}

export function OfficerDesk({
  officer,
  defaultOpen,
  children,
}: {
  officer: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const value = useDeskState(officer);
  const {
    screen,
    setSelected,
    queue,
    history,
    exportHistory,
    dialog,
    setDialog,
    selected,
    reason,
    setReason,
    decide,
  } = value;
  return (
    <DeskContext.Provider value={value}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="officer-desk"
        style={{ "--sidebar-width": "244px" } as React.CSSProperties}
      >
        <OfficerSidebar
          officer={officer}
          queueCount={queue.length}
        />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-10 flex min-h-15 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
            <SidebarTrigger className="shrink-0" />
            <span className="text-sm font-medium">{t.nav[screen]}</span>
            <span className="ml-auto text-sm text-muted-foreground">{t.town}</span>
          </header>
          <main className="desk-main space-y-6 p-4 md:p-8 xl:p-10">
            <Alert className="rounded-lg border-primary/15 bg-primary/5 py-2.5">
              <AlertDescription className="flex flex-wrap items-center gap-x-2 text-xs">
                <Badge
                  variant="outline"
                  className="rounded text-[10px] text-primary"
                >
                  {screen === "map" ? mapNl.title : t.demo}
                </Badge>
                {screen === "map" ? mapNl.registerNote : t.demoNote}
              </AlertDescription>
            </Alert>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[30px]">
                  {t.titles[screen]}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {t.descriptions[screen]}
                </p>
              </div>
              {screen === "history" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!history.length}
                  onClick={exportHistory}
                >
                  <Download />
                  {t.export}
                </Button>
              )}
            </div>
            {children}
            <footer className="desk-footer flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-[11px] leading-relaxed text-muted-foreground">
              <p className="max-w-xl">{nl.attribution}</p>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />{t.approvalNote}</span>
            </footer>
          </main>
        </SidebarInset>
        <Sheet open={selected !== null} onOpenChange={(open) => { if (!open && !dialog) setSelected(null); }}>
          <SheetContent className="w-full! sm:max-w-xl! overflow-y-auto">
            <SheetHeader className="pr-14">
              <SheetTitle>{t.detailsTitle}</SheetTitle>
              <SheetDescription>{t.detailsNote}</SheetDescription>
              <p className="text-xs text-muted-foreground">{t.sessionOnly}</p>
            </SheetHeader>
            {value.details}
          </SheetContent>
        </Sheet>
        <Dialog
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {dialog === "Afgewezen" ? t.rejectTitle : t.confirmTitle}
              </DialogTitle>
              <DialogDescription>{t.dialogNote}</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {selected.naam} · {selected.adres}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.voorstelLang}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">{t.reason}</Label>
              <Textarea
                id="reason"
                placeholder={t.reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.evidence}:{" "}
              {selected?.bewijs
                .map((b) => b.bron + " (" + b.datum + ")")
                .join(" · ")}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                {t.cancel}
              </Button>
              <Button onClick={decide}>
                {dialog === "Afgewezen" ? t.saveReject : t.saveConfirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </DeskContext.Provider>
  );
}

export function OverviewView() {
  const { queue, streets, setQuery, setScreen } = useDesk();
  const [search, setSearch] = useState("");
  return <div className="mx-auto max-w-4xl space-y-6">
    <Card className="gap-5 p-6 md:p-8">
      <div><h2 className="font-heading text-xl font-semibold">{t.startTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{t.startNote}</p></div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setScreen("street"); }}>
        <div className="flex-1 space-y-2"><Label htmlFor="start-search">{t.search}</Label><Input id="start-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchHint} className="h-11" /></div>
        <Button type="submit" className="h-11 sm:self-end"><Search className="size-4" />{t.searchAction}</Button>
      </form>
      <div className="flex flex-wrap gap-2">{streets.map((street) => <Button key={street.name} variant="outline" size="sm" onClick={() => { setQuery(street.name); setScreen("street"); }}><MapPin className="size-3.5" />{street.name}</Button>)}</div>
    </Card>
    <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <ClipboardCheck className="size-6 shrink-0 text-muted-foreground" />
      <div className="flex-1"><h2 className="text-base font-semibold">{queue.length ? `${queue.length} ${t.waitingReview}` : t.noQueue}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{queue.length ? t.focusNote : t.noQueueNote}</p></div>
      <Button onClick={() => setScreen(queue.length ? "review" : "history")}>{queue.length ? t.startReview : t.viewHistory}<ArrowRight className="size-4" /></Button>
    </Card>
  </div>;
}

export function StreetView() {
  const { selected, rows, setSelected, decisions, query, setQuery } = useDesk();
  const columns: DeskColumn<DemoRecord>[] = [
    { id: "address", label: t.columns[0], value: (r) => r.adres, required: true },
    { id: "name", label: t.columns[1], value: (r) => r.naam + " " + r.ondNr + " " + r.vestNr, required: true,
      cell: (r) => <div className="min-w-36"><Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left text-sm text-foreground" onClick={() => setSelected(r)}>{r.naam}</Button><p className="mt-1 text-[11px] text-muted-foreground">{r.soort}</p></div> },
    { id: "register", label: t.columns[2], value: (r) => r.register, filter: true, cell: (r) => <Badge variant={r.register === "Ontbreekt" ? "destructive" : "outline"}>{r.register}</Badge> },
    { id: "evidence", label: t.columns[3], value: (r) => r.bewijs[0]?.bron ?? "—" },
    { id: "observed", label: t.columns[4], value: (r) => r.laatste, sortable: false },
    { id: "confidence", label: t.columns[5], value: (r) => r.zekerheid, filter: true, cell: (r) => <Confidence value={r.zekerheid} /> },
    { id: "proposal", label: t.columns[6], value: (r) => decisions[r.adres] ?? r.voorstel, filter: true },
  ];
  return <Panel>
    <DeskDataTable data={rows} columns={columns} getId={(r) => r.adres} activeId={selected?.adres} searchValue={query} onSearchChange={setQuery} searchLabel={t.search} />
  </Panel>;
}

export function ReviewView() {
  const { queue, openRecord } = useDesk();
  return queue.length ? <Panel>
    <div className="divide-y">{queue.map((record) => <div key={record.adres} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{record.naam}</h2><p className="mt-1 text-sm text-muted-foreground">{record.adres} · {record.soort}</p><p className="mt-3 text-sm leading-relaxed">{record.voorstelLang}</p></div>
      <Button variant="outline" onClick={() => openRecord(record)}>{t.openDossier}<ArrowRight className="size-4" /></Button>
    </div>)}</div>
  </Panel> : <Nothing title={t.noQueue} description={t.noQueueNote} />;
}

export function HistoryView() {
  const { history } = useDesk();
  const columns: DeskColumn<Entry>[] = [
    { id: "time", label: t.time, value: (e) => e.id, cell: (e) => e.when },
    { id: "record", label: t.historyRecord, value: (e) => `${e.record.naam} · ${e.record.adres}`, required: true },
    { id: "change", label: t.change, value: (e) => e.record.voorstel, filter: true },
    { id: "evidence", label: t.evidence, value: (e) => e.record.bewijs.map((b) => b.bron + " · " + b.datum).join("; ") },
    { id: "officer", label: t.employee, value: (e) => e.who, filter: true },
    { id: "status", label: t.status, value: (e) => e.status, filter: true, cell: (e) => <Badge variant="outline">{e.status}</Badge> },
    { id: "reason", label: t.reason, value: (e) => e.reason || "—" },
  ];
  return history.length ? <Panel><DeskDataTable data={history} columns={columns} getId={(e) => String(e.id)} /></Panel> : <Nothing title={t.noHistory} description={t.noHistoryNote} />;
}

export function MapView() {
  const { openRecord, setScreen } = useDesk();
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_260px]">
      <Panel>
        <div className="relative aspect-[16/10] min-h-72 overflow-hidden bg-background bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[40px_40px]">
          <Separator className="absolute top-[38%] h-2!" />
          <Separator
            orientation="vertical"
            className="absolute left-[28%] w-2!"
          />
          <Separator
            orientation="vertical"
            className="absolute left-[66%] w-2!"
          />
          <span className="absolute left-[6%] top-[27%] text-[11px] tracking-wider text-muted-foreground">
            PAALSTRAAT
          </span>
          <span className="absolute bottom-[15%] left-[32%] text-[11px] tracking-wider text-muted-foreground">
            CHURCHILLLAAN
          </span>
          {demoRecords.map((r) => (
            <Tooltip key={r.adres}>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={r.adres + " · " + r.naam}
                    onClick={() => openRecord(r)}
                    className={cn(
                      "absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background p-0 shadow-sm",
                      r.zekerheid === "Hoog"
                        ? "bg-primary hover:bg-primary/80"
                        : r.zekerheid === "Middel"
                          ? "bg-amber-400 hover:bg-amber-300"
                          : "bg-muted-foreground hover:bg-muted-foreground/80",
                    )}
                    style={{ left: r.x + "%", top: r.y + "%" }}
                  />
                }
              />
              <TooltipContent>
                {r.adres} · {r.naam}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </Panel>
      <div className="space-y-4">
        <Panel title={t.legend}>
          <div className="space-y-3 p-4">
            {(["Hoog", "Middel", "Laag"] as const).map((value, i) => (
              <div key={value} className="flex items-center gap-2 text-xs">
                <MapPin className="size-3.5" />
                <span>{[t.high, t.medium, t.low][i]}</span>
                <Badge variant="outline" className="ml-auto">
                  {demoRecords.filter((r) => r.zekerheid === value).length}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.mapNote}
        </p>
        <Button variant="outline" onClick={() => setScreen("street")}>
          {t.toStreet}
        </Button>
      </div>
    </div>
  );
}

export function SourcesView() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={t.activeTown}>
        <p className="px-4 pt-4 text-sm leading-relaxed text-muted-foreground">{t.sampleNote}</p>
        <div className="space-y-4 p-4">
          <p className="text-lg font-semibold">{t.town}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.townNote}
          </p>
        </div>
      </Panel>
      <Panel title={t.nav.sources}>
        <Table>
          <TableBody>
            {deskSources.map((source, index) => (
              <TableRow key={source}>
                <TableCell className="whitespace-normal px-4 py-3 text-xs">
                  {source}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {index < 2 ? t.sourceMap : t.sourcePending}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t p-4 text-xs text-muted-foreground">
          <a href="https://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/v1.0" target="_blank" rel="noreferrer" className="underline underline-offset-2">{t.licence}</a>
        </p>
      </Panel>
      <Accordion className="lg:col-span-2"><AccordionItem value="limits"><AccordionTrigger>{t.dataLimitsTitle}</AccordionTrigger><AccordionContent><ul className="list-disc space-y-3 pl-5 leading-relaxed text-muted-foreground">{t.dataLimits.map((limit) => <li key={limit}>{limit}</li>)}</ul></AccordionContent></AccordionItem></Accordion>
    </div>
  );
}

export function StatesView() {
  const { state, setState, setQuery, setScreen } = useDesk();
  return (
    <Tabs value={state} onValueChange={setState}>
      <TabsList>
        <TabsTrigger value="loading">{t.loading}</TabsTrigger>
        <TabsTrigger value="empty">{t.empty}</TabsTrigger>
        <TabsTrigger value="error">{t.error}</TabsTrigger>
      </TabsList>
      <TabsContent value="loading" className="mt-5 max-w-3xl">
        <Panel>
          <div className="space-y-4 p-4">
            <p className="text-xs text-muted-foreground">{t.loadingNote}</p>
            {[78, 92, 64, 86, 71, 95].map((w) => (
              <div key={w} className="grid grid-cols-[1fr_3fr_1fr] gap-4">
                <Skeleton className="h-3" />
                <Skeleton className="h-3" style={{ width: w + "%" }} />
                <Skeleton className="h-3" />
              </div>
            ))}
          </div>
        </Panel>
      </TabsContent>
      <TabsContent value="empty" className="mt-5 max-w-xl">
        <Nothing title={t.emptyTitle} description={t.emptyNote}>
          <Button
            onClick={() => {
              setQuery("");
              setScreen("street");
            }}
          >
            {t.clear}
          </Button>
        </Nothing>
      </TabsContent>
      <TabsContent value="error" className="mt-5 max-w-xl">
        <Panel>
          <div className="space-y-3 p-5">
            <Badge variant="destructive">{t.errorTitle}</Badge>
            <h3 className="font-heading font-semibold">{t.errorDetail}</h3>
            <p className="text-sm text-muted-foreground">{t.errorNote}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setState("loading")}>
                {t.retry}
              </Button>
              <Button variant="ghost" onClick={() => setScreen("street")}>
                {t.continue}
              </Button>
            </div>
          </div>
        </Panel>
      </TabsContent>
    </Tabs>
  );
}
