"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Search, ArrowRight, MapPin, Download, ShieldCheck, ClipboardCheck, Building2, ScanSearch, Store, History, ArrowUpRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { deskRoutes } from "@/lib/desk-routes";
import { OfficerSidebar } from "@/components/officer-sidebar";
import { DeskCommandBar } from "@/components/desk-command-bar";
import { DeskDataTable, type DeskColumn } from "@/components/desk-data-table";
import { DashboardCharts } from "@/components/dashboard-charts";
import { demoRecords, type DemoRecord } from "@/lib/officer-demo";
import { deskNl as t, nl, deskSources } from "@/lib/nl";
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
  const [query, setQuery] = useState("Paalstraat");
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
    setQuery("");
    setScreen("street");
  }
  function ask(record: DemoRecord, status: Decision) {
    setSelected(record);
    setReason("");
    setDialog(status);
  }
  function decide() {
    if (!selected || !dialog) return;
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
        <div className="mt-3 flex gap-2">
          <Badge
            variant={
              selected.register === "Ontbreekt" ? "destructive" : "outline"
            }
            className="rounded-md"
          >
            {selected.register}
          </Badge>
          <Confidence value={selected.zekerheid} />
        </div>
      </div>
      <div className="space-y-3 border-b p-4">
        <h4 className="text-xs font-medium text-muted-foreground">
          {t.relation}
        </h4>
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
      <div className="border-b p-4">
        <h4 className="mb-2 text-xs text-muted-foreground">{t.contact}</h4>
        <p className="text-sm">{selected.contact}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selected.contactNiveau} · {selected.contactBron}
        </p>
      </div>
      <div className="bg-muted/60 p-4">
        <h4 className="mb-2 text-xs text-muted-foreground">{t.proposal}</h4>
        <p className="text-sm">{selected.voorstelLang}</p>
        <div className="mt-4 flex flex-wrap gap-2">
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
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {decisions[selected.adres] ?? t.pending}
        </p>
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
    query,
    setQuery,
    setSelected,
    setScreen,
    rows,
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
          recordCount={demoRecords.length}
        />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-10 flex min-h-15 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
            <SidebarTrigger className="shrink-0" />
            <DeskCommandBar
              onNavigate={setScreen}
              onOpenRecord={value.openRecord}
              onSearch={(nextQuery) => {
                setQuery(nextQuery);
                setSelected(null);
                setScreen("street");
              }}
            />
            <span className="ml-auto hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
              {rows.length} / {demoRecords.length} {t.records}
            </span>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => setScreen("review")}
            >
              {t.review}
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {queue.length}
              </Badge>
            </Button>
          </header>
          <main className="desk-main space-y-6 p-4 md:p-8 xl:p-10">
            <Alert className="rounded-lg border-primary/15 bg-primary/5 py-2.5">
              <AlertDescription className="flex flex-wrap items-center gap-x-2 text-xs">
                <Badge
                  variant="outline"
                  className="rounded text-[10px] text-primary"
                >
                  {t.demo}
                </Badge>
                {t.demoNote}
              </AlertDescription>
            </Alert>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t.workspaceLabel}</p>
                <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[30px]">
                  {screen === "street"
                    ? (query || t.titles.street) + " · " + t.town
                    : t.titles[screen]}
                </h1>
                <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
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
        <Dialog
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
        >
          <DialogContent className="rounded-xl sm:max-w-lg">
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
  const { queue, streets, setQuery, setSelected, setScreen, history, openRecord } =
    useDesk();
  const statIcons = [Building2, ScanSearch, Store, ClipboardCheck];
  return (
    <>
      <Card className="desk-focus gap-0 p-0">
        <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-xl">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" />{t.focusLabel}</p>
            <h2 className="max-w-md font-heading text-2xl font-semibold leading-tight tracking-tight md:text-[32px]">{t.focusTitle}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t.focusNote}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => setScreen("review")}>{t.startReview}<ArrowRight className="size-4" /></Button>
              <Button variant="outline" onClick={() => { setQuery(""); setSelected(null); setScreen("street"); }}>{t.exploreStreets}</Button>
            </div>
          </div>
          <div className="flex items-center gap-6 lg:pr-4">
            <div className="desk-focus-count rounded-xl border border-border/60 bg-card/85 p-5 backdrop-blur-sm">
              <p className="font-heading text-6xl font-semibold tracking-tighter text-primary tabular-nums">{queue.length.toString().padStart(2, "0")}</p>
              <p className="mt-2 max-w-32 text-xs leading-relaxed text-muted-foreground">{t.waitingReview}</p>
              <p className="mt-4 text-[11px] text-muted-foreground">{t.sessionProgress}: <strong className="text-foreground tabular-nums">{history.length}</strong></p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          demoRecords.length,
          demoRecords.filter((r) => r.zekerheid === "Laag").length,
          demoRecords.filter((r) => r.register === "Ontbreekt").length,
          queue.length,
        ].map((count, i) => {
          const Icon = statIcons[i];
          return (
          <Card key={i} className={cn(panel, "desk-stat gap-1 p-5")}>
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{t.stats[i]}</p><Icon className="size-4 text-primary/65" /></div>
            <p className="my-2 font-heading text-3xl font-semibold tracking-tight tabular-nums">
              {count}
            </p>
            <p className="text-xs text-muted-foreground">{t.statNotes[i]}</p>
          </Card>
        );})}
      </div>
      <DashboardCharts
        records={demoRecords}
        queue={queue}
        onOpenRecord={openRecord}
        onOpenStreet={(street) => {
          setQuery(street);
          setSelected(null);
          setScreen("street");
        }}
      />
      {queue.length > 0 && (
        <Panel title={t.reviewFirst} description={t.reviewFirstNote}>
          <div className="divide-y">
            {queue.slice(0, 3).map((record) => (
              <div key={record.adres} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-primary"><Store className="size-4" /></span>
                <div className="min-w-0 flex-1 basis-40"><p className="text-sm font-medium">{record.naam}</p><p className="mt-1 text-xs text-muted-foreground">{record.adres} · {record.soort}</p></div>
                <p className="hidden max-w-56 flex-1 text-xs leading-relaxed text-muted-foreground lg:block">{record.voorstel}</p>
                <Confidence value={record.zekerheid} />
                <Button variant="outline" size="sm" onClick={() => openRecord(record)}>{t.openDossier}<ArrowUpRight className="size-3.5" /></Button>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/30 px-5 py-2"><Button variant="link" size="sm" className="px-0" onClick={() => setScreen("review")}>{t.viewAll}<ArrowRight className="size-3.5" /></Button></div>
        </Panel>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Panel title={t.streetTitle} description={t.streetNote}>
          <Table>
            <TableBody>
              {streets.map((st) => (
                <TableRow key={st.name}>
                  <TableCell className="pl-4">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-foreground"
                      onClick={() => {
                        setQuery(st.name);
                        setSelected(null);
                        setScreen("street");
                      }}
                    >
                      {st.name}
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {st.records} {t.records}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("rounded-md", tones.Middel)}
                    >
                      {st.open} {t.open}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel title={t.recent} description={t.recentNote}>
          {history.length ? (
            <div className="divide-y px-4">
              {history.slice(0, 4).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-3 text-xs"
                >
                  <span className="text-muted-foreground">{e.when}</span>
                  <span className="flex-1">{e.record.naam}</span>
                  <Badge variant="outline">{e.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/60 text-primary"><History className="size-5" /></span>
              <p className="text-sm font-medium">{t.historyEmptyTitle}</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{t.historyEmptyNote}</p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

export function StreetView() {
  const { selected, rows, setSelected, decisions, setQuery, details } = useDesk();
  const columns: DeskColumn<DemoRecord>[] = [
    { id: "address", label: t.columns[0], value: (r) => r.adres, required: true },
    { id: "name", label: t.columns[1], value: (r) => r.naam + " " + r.ondNr + " " + r.vestNr, required: true,
      cell: (r) => <div className="min-w-36"><Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left text-xs text-foreground" onClick={() => setSelected(r)}>{r.naam}</Button><p className="mt-1 text-[11px] text-muted-foreground">{r.soort}</p></div> },
    { id: "register", label: t.columns[2], value: (r) => r.register, filter: true, cell: (r) => <Badge variant={r.register === "Ontbreekt" ? "destructive" : "outline"}>{r.register}</Badge> },
    { id: "evidence", label: t.columns[3], value: (r) => r.bewijs[0]?.bron ?? "—" },
    { id: "observed", label: t.columns[4], value: (r) => r.laatste, sortable: false },
    { id: "confidence", label: t.columns[5], value: (r) => r.zekerheid, filter: true, cell: (r) => <Confidence value={r.zekerheid} /> },
    { id: "proposal", label: t.columns[6], value: (r) => decisions[r.adres] ?? r.voorstel, filter: true },
  ];
  return <div className={cn("grid items-start gap-4", selected && "xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,.95fr)]")}>
    <div className="min-w-0">{rows.length ? <Panel>
      <DeskDataTable data={rows} columns={columns} getId={(r) => r.adres} rowLabel={(r) => r.naam} activeId={selected?.adres} />
      <p className="border-t p-3 text-[11px] leading-relaxed text-muted-foreground">{nl.attribution} · {t.sampleNote}</p>
    </Panel> : <Nothing title={t.emptyTitle} description={t.emptyNote}><Button onClick={() => setQuery("")}>{t.clear}</Button></Nothing>}</div>
    {selected && <aside className="xl:sticky xl:top-20">{details}</aside>}
  </div>;
}

export function ReviewView() {
  const { queue, openRecord, ask } = useDesk();
  const columns: DeskColumn<DemoRecord>[] = [
    { id: "proposal", label: t.proposal, value: (r) => r.voorstel, filter: true },
    { id: "address", label: t.columns[0], value: (r) => r.adres, required: true },
    { id: "name", label: t.enterprise, value: (r) => r.naam, required: true },
    { id: "confidence", label: t.certainty, value: (r) => r.zekerheid, filter: true, cell: (r) => <Confidence value={r.zekerheid} /> },
    { id: "source", label: t.source, value: (r) => r.bewijs[0]?.bron ?? "—", filter: true },
    { id: "actions", label: t.decision, value: () => "", sortable: false, required: true,
      cell: (r) => <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => openRecord(r)}>{t.evidence}</Button><Button size="sm" onClick={() => ask(r, "Bevestigd")}>{t.confirm}</Button><Button size="sm" variant="ghost" onClick={() => ask(r, "Afgewezen")}>{t.reject}</Button></div> },
  ];
  return queue.length ? <Panel><DeskDataTable data={queue} columns={columns} getId={(r) => r.adres} rowLabel={(r) => r.naam} /></Panel> : <Nothing title={t.noQueue} description={t.noQueueNote} />;
}

export function HistoryView() {
  const { history } = useDesk();
  const columns: DeskColumn<Entry>[] = [
    { id: "time", label: t.time, value: (e) => e.id, cell: (e) => e.when },
    { id: "record", label: t.record, value: (e) => e.record.vestNr, required: true },
    { id: "change", label: t.change, value: (e) => e.record.voorstel, filter: true },
    { id: "evidence", label: t.evidence, value: (e) => e.record.bewijs.map((b) => b.bron + " · " + b.datum).join("; ") },
    { id: "officer", label: t.employee, value: (e) => e.who, filter: true },
    { id: "status", label: t.status, value: (e) => e.status, filter: true, cell: (e) => <Badge variant="outline">{e.status}</Badge> },
    { id: "reason", label: t.reason, value: (e) => e.reason || "—" },
  ];
  return history.length ? <Panel><DeskDataTable data={history} columns={columns} getId={(e) => String(e.id)} rowLabel={(e) => e.record.naam} /></Panel> : <Nothing title={t.noHistory} description={t.noHistoryNote} />;
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
        <div className="space-y-4 p-4">
          <Label htmlFor="town">{t.region}</Label>
          <Input id="town" readOnly value={t.town} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.townNote}
          </p>
        </div>
      </Panel>
      <Panel title={t.nav.sources}>
        <Table>
          <TableBody>
            {deskSources.map((source) => (
              <TableRow key={source}>
                <TableCell className="whitespace-normal px-4 py-3 text-xs">
                  {source}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {t.sourcePending}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t p-4 text-xs text-muted-foreground">
          {t.licence}
        </p>
      </Panel>
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
