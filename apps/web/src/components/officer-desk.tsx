"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { Search, ArrowRight, Download } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { deskRoutes } from "@/lib/desk-routes";
import { OfficerSidebar } from "@/components/officer-sidebar";
import {
  api,
  loadWorkspace,
  toRecord,
  fieldLabel,
  type RecordView,
} from "@/lib/officer-data";
import type { Detail } from "@straatbeeld/contracts";
import { deskNl as t, nl } from "@/lib/nl";
import { ShieldCheck, ClipboardCheck, Building2, ScanSearch, Store, History, ArrowUpRight } from "lucide-react";
import { DeskCommandBar } from "@/components/desk-command-bar";
import { DeskDataTable, type DeskColumn } from "@/components/desk-data-table";
import { DashboardCharts } from "@/components/dashboard-charts";
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
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type Screen = keyof typeof t.nav;
type Decision = "Bevestigd" | "Afgewezen";
type Entry = {
  id: string;
  when: string;
  record: RecordView;
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
function Confidence({ value }: { value: RecordView["zekerheid"] }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md text-[11px] font-medium", tones[value])}
    >
      {
        {
          Hoog: "Onderbouwd",
          Middel: "Te controleren",
          Laag: "Onvoldoende bewijs",
        }[value]
      }
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

function useDeskState(officer: string, officerId: string) {
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
  const [selected, setSelected] = useState<RecordView | null>(null);
  const [dossiers, setDossiers] = useState<Detail[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [corrected, setCorrected] = useState("");
  const records = dossiers.map((d) => toRecord(d));
  const history: Entry[] = dossiers
    .flatMap((d) =>
      d.reviews.map((r) => ({
        id: r.reviewId,
        when: new Date(r.reviewedAt).toLocaleString("nl-BE"),
        record: {
          ...toRecord(d, r.proposalId),
          voorstel: `${fieldLabel(d.establishment.proposals.find((p) => p.id === r.proposalId)?.field ?? "Wijziging")}: ${r.effectiveValue ?? "afgewezen"}`,
          bewijs: toRecord(d, r.proposalId).proposalEvidence,
        },
        status: (r.decision === "approve"
          ? "Bevestigd"
          : "Afgewezen") as Decision,
        reason: r.note ?? "",
        who:
          r.reviewerId === officerId
            ? officer
            : (r.reviewerId ?? "Niet vastgelegd (oud record)"),
        time: r.reviewedAt,
      })),
    )
    .sort((a, b) => b.time.localeCompare(a.time));
  async function reload() {
    try {
      const next = await loadWorkspace();
      setError("");
      setDossiers(next);
      setSelected((old) => {
        const d = next.find((d) => d.establishment.id === old?.id);
        return d ? toRecord(d, old?.proposal?.id) : null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((next) => {
        if (active) setDossiers(next);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Laden mislukt.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [state, setState] = useState("loading");
  const rows = records.filter((r) =>
    (r.adres + " " + r.naam + " " + r.ondNr + " " + r.vestNr)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const queue = dossiers.flatMap((d) =>
    d.establishment.proposals
      .filter((p) => p.reviewState === "pending")
      .map((p) => toRecord(d, p.id)),
  );
  const streets = [...new Set(records.map((r) => r.street))]
    .map((name) => ({
      name,
      records: records.filter((r) => r.street === name).length,
      open: queue.filter((r) => r.street === name).length,
    }))
    .sort((a, b) => b.open - a.open);
  function openRecord(record: RecordView) {
    setSelected(record);
    setQuery("");
    setScreen("street");
  }
  function ask(record: RecordView, status: Decision) {
    setSelected(record);
    setReason("");
    setCorrected(record.proposal?.proposedValue ?? "");
    setDialog(status);
  }
  async function decide() {
    if (!selected?.proposal || !dialog || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          proposalId: selected.proposal.id,
          expectedRevision: selected.proposal.revision,
          decision: dialog === "Bevestigd" ? "approve" : "reject",
          ...(dialog === "Bevestigd" ? { correctedValue: corrected } : {}),
          note: reason,
        }),
      });
      setDialog(null);
      await reload();
      setNotice("Beoordeling opgeslagen.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }
  async function refreshSelected() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await (
        await api(`/api/establishments/${selected.id}/refresh`, {
          method: "POST",
        })
      ).json();
      await reload();
      setNotice(r.messageNl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Broncontrole mislukt.");
    } finally {
      setBusy(false);
    }
  }
  async function exportHistory() {
    try {
      const blob = await (await api("/api/export?municipality=Schoten")).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "straatbeeld-goedgekeurd.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export mislukt.");
    }
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
              {b.url && (
                <a
                  className="underline"
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bron openen
                </a>
              )}
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
        {selected.detail.establishment.proposals.length > 1 && (
          <select
            aria-label="Voorstel kiezen"
            className="my-3 w-full rounded border p-2 text-sm"
            value={selected.proposal?.id ?? ""}
            onChange={(e) =>
              setSelected(toRecord(selected.detail, e.target.value))
            }
          >
            {selected.detail.establishment.proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {fieldLabel(p.field)} ·{" "}
                {p.reviewState === "pending"
                  ? "open"
                  : p.reviewState === "approved"
                    ? "bevestigd"
                    : "afgewezen"}
              </option>
            ))}
          </select>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={refreshSelected}
        >
          {busy ? "Bezig…" : "Bronnen opnieuw controleren"}
        </Button>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !selected.proposal}
            onClick={() => ask(selected, "Bevestigd")}
          >
            {t.confirm}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !selected.proposal}
            onClick={() => ask(selected, "Afgewezen")}
          >
            {t.reject}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
            {t.later}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {selected.proposal?.reviewState === "approved"
            ? "Bevestigd en opgeslagen."
            : selected.proposal?.reviewState === "rejected"
              ? "Afgewezen en opgeslagen."
              : t.pending}
        </p>
      </div>
    </Panel>
  );

  return {
    records,
    dossiers,
    loading,
    error,
    busy,
    notice,
    corrected,
    setCorrected,
    reload,
    screen,
    setScreen,
    query,
    setQuery,
    selected,
    setSelected,
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
  officerId,
  defaultOpen,
  children,
}: {
  officer: string;
  officerId: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const value = useDeskState(officer, officerId);
  const {
    records,
    loading,
    error,
    busy,
    notice,
    corrected,
    setCorrected,
    reload,
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
          recordCount={records.length}
        />
        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-10 flex min-h-15 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
            <SidebarTrigger className="shrink-0" />
            <DeskCommandBar
              records={records}
              onNavigate={setScreen}
              onOpenRecord={value.openRecord}
              onSearch={(nextQuery) => {
                setQuery(nextQuery);
                setSelected(null);
                setScreen("street");
              }}
            />
            <span className="ml-auto hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
              {rows.length} / {records.length} {t.records}
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
            {error && (
              <Alert variant="destructive">
                <AlertDescription role="alert">
                  {error}
                  <Button variant="outline" size="sm" onClick={reload}>
                    Opnieuw laden
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {notice && (
              <p role="status" className="text-sm">
                {notice}
              </p>
            )}
            {loading ? <p role="status">Dossiers laden…</p> : children}
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
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {dialog === "Bevestigd" && (
              <div className="space-y-2">
                <Label htmlFor="corrected">
                  Goedgekeurde waarde (aanpasbaar)
                </Label>
                <Input
                  id="corrected"
                  value={corrected}
                  onChange={(e) => setCorrected(e.target.value)}
                  maxLength={2000}
                />
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
              {selected?.proposalEvidence
                .map((b) => b.bron + " (" + b.datum + ")")
                .join(" · ")}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                {t.cancel}
              </Button>
              <Button disabled={busy} onClick={decide}>
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
  const { records, queue, streets, setQuery, setSelected, setScreen, history, openRecord } =
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
          records.length,
          records.filter((r) => r.zekerheid === "Laag").length,
          records.filter((r) => !r.detail.establishment.parent).length,
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
        records={records}
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
              <div key={record.proposal?.id ?? record.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
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
  const { selected, rows, setSelected, setQuery, details } = useDesk();
  const columns: DeskColumn<RecordView>[] = [
    { id: "address", label: t.columns[0], value: (r) => r.adres, required: true },
    { id: "name", label: t.columns[1], value: (r) => r.naam + " " + r.ondNr + " " + r.vestNr, required: true,
      cell: (r) => <div className="min-w-36"><Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left text-xs text-foreground" onClick={() => setSelected(r)}>{r.naam}</Button><p className="mt-1 text-[11px] text-muted-foreground">{r.soort}</p></div> },
    { id: "register", label: t.columns[2], value: (r) => r.register, filter: true, cell: (r) => <Badge variant={r.register === "Ontbreekt" ? "destructive" : "outline"}>{r.register}</Badge> },
    { id: "evidence", label: t.columns[3], value: (r) => r.bewijs[0]?.bron ?? "—" },
    { id: "observed", label: t.columns[4], value: (r) => r.laatste, sortable: false },
    { id: "confidence", label: t.columns[5], value: (r) => r.zekerheid, filter: true, cell: (r) => <Confidence value={r.zekerheid} /> },
    { id: "proposal", label: t.columns[6], value: (r) => r.voorstel, filter: true },
  ];
  return <div className={cn("grid items-start gap-4", selected && "xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,.95fr)]")}>
    <div className="min-w-0">{rows.length ? <Panel>
      <DeskDataTable data={rows} columns={columns} getId={(r) => r.proposal?.id ?? r.id} rowLabel={(r) => r.naam} activeId={selected?.proposal?.id ?? selected?.id} />
      <p className="border-t p-3 text-[11px] leading-relaxed text-muted-foreground">{nl.attribution} · {t.sampleNote}</p>
    </Panel> : <Nothing title={t.emptyTitle} description={t.emptyNote}><Button onClick={() => setQuery("")}>{t.clear}</Button></Nothing>}</div>
    {selected && <aside className="xl:sticky xl:top-20">{details}</aside>}
  </div>;
}

export function ReviewView() {
  const { queue, openRecord, ask } = useDesk();
  const columns: DeskColumn<RecordView>[] = [
    { id: "proposal", label: t.proposal, value: (r) => r.voorstel, filter: true },
    { id: "address", label: t.columns[0], value: (r) => r.adres, required: true },
    { id: "name", label: t.enterprise, value: (r) => r.naam, required: true },
    { id: "confidence", label: t.certainty, value: (r) => r.zekerheid, filter: true, cell: (r) => <Confidence value={r.zekerheid} /> },
    { id: "source", label: t.source, value: (r) => r.bewijs[0]?.bron ?? "—", filter: true },
    { id: "actions", label: t.decision, value: () => "", sortable: false, required: true,
      cell: (r) => <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => openRecord(r)}>{t.evidence}</Button><Button size="sm" onClick={() => ask(r, "Bevestigd")}>{t.confirm}</Button><Button size="sm" variant="ghost" onClick={() => ask(r, "Afgewezen")}>{t.reject}</Button></div> },
  ];
  return queue.length ? <Panel><DeskDataTable data={queue} columns={columns} getId={(r) => r.proposal?.id ?? r.id} rowLabel={(r) => r.naam} /></Panel> : <Nothing title={t.noQueue} description={t.noQueueNote} />;
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

export function SourcesView() {
  const { dossiers } = useDesk();
  const sources = [
    ...new Map(
      dossiers.flatMap((d) => d.sources).map((s) => [s.url, s]),
    ).values(),
  ];
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={t.activeTown}>
        <div className="space-y-4 p-4">
          <Label htmlFor="town">{t.region}</Label>
          <Input id="town" readOnly value={t.town} />
          <p className="text-xs">{t.townNote}</p>
          <p className="text-xs">{t.sampleNote}</p>
        </div>
      </Panel>
      <Panel title="Gekoppelde bronnen">
        <Table>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.url}>
                <TableCell className="whitespace-normal p-4 text-xs">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {s.publisher}
                  </a>
                  <p>Opgehaald: {s.retrievedAt.slice(0, 10)}</p>
                  <p>
                    Registerpeildatum: {s.registrySnapshotDate ?? "onbekend"}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {s.kind === "registry" ? "Register" : "Website"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
