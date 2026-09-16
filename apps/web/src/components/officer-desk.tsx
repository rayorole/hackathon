"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  Search,
  ArrowRight,
  Download,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  List,
} from "lucide-react";
import {
  Building2,
  ClipboardCheck,
  ShieldCheck,
  MapPin,
  CircleHelp,
  Clock3,
} from "lucide-react";
import {
  BusinessAvatar,
  FieldIcon,
  StatusPill,
  PanelTitle,
  FieldValue,
} from "./data-display";
import { presentationNl as t } from "@/lib/nl";
import { api, fieldLabel, sourceDate } from "@/lib/officer-data";
import { approvedChanges, evidenceGroups } from "@/lib/review-presentation";
import { uxNl as u, nl } from "@/lib/nl";
import { OfficerSidebar } from "./officer-sidebar";
import { DeskCommandBar } from "./desk-command-bar";
import { DeskProvider, useDesk } from "./desk-context";
import { BusinessDetail, Disclosure, Evidence } from "./business-detail";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Skeleton } from "./ui/skeleton";

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
  return (
    <DeskProvider officer={officer} officerId={officerId}>
      <DeskShell defaultOpen={defaultOpen}>{children}</DeskShell>
    </DeskProvider>
  );
}
function DeskShell({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const desk = useDesk();
  const viewKey = `${desk.screen}:${desk.params.get("zaak") ?? ""}:${desk.params.get("voorstel") ?? ""}`;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [viewKey]);
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="officer-desk task-first premium-desk"
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
    >
      <OfficerSidebar
        officer={desk.officer}
        queueCount={desk.queue.length}
        recordCount={desk.records.length}
        onNavigate={desk.navigate}
        onBeforeLeave={desk.guard}
      />
      <SidebarInset className="min-w-0 bg-background">
        <header className="workspace-topbar flex min-h-16 items-center gap-4 border-b px-4 md:px-8">
          <SidebarTrigger />
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            <span>Schoten</span>
            <span className="hidden text-muted-foreground sm:inline">
              / {u.titles[desk.screen]}
            </span>
          </div>
          <div className="ml-auto hidden sm:block">
            <DeskCommandBar
              records={desk.records}
              onNavigate={desk.navigate}
              onOpenRecord={desk.openRecord}
              onSearch={(q) =>
                desk.guard(() =>
                  desk.updateParams(
                    { q, zaak: null, voorstel: null, page: null },
                    "street",
                  ),
                )
              }
            />
          </div>
        </header>
        <main
          id="main-content"
          className="desk-main space-y-7 p-5 md:p-8 lg:p-10"
        >
          {!desk.selected && (
            <header className="page-heading">
              <h1 className="text-2xl font-semibold tracking-tight">
                {u.titles[desk.screen]}
              </h1>
              {!["street", "map"].includes(desk.screen) && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {desk.screen === "overview"
                    ? t.startIntro
                    : desk.screen === "review"
                      ? t.reviewIntro
                      : desk.screen === "history"
                        ? t.historyIntro
                        : desk.screen === "sources"
                          ? t.sourcesIntro
                          : ""}
                </p>
              )}
              {["street", "map"].includes(desk.screen) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {u.coverage}
                </p>
              )}
            </header>
          )}
          {desk.error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm"
            >
              <p>{desk.error}</p>
              <Button
                variant="outline"
                onClick={() =>
                  desk.reload().catch((e) => desk.setError(e.message))
                }
              >
                {u.retry}
              </Button>
            </div>
          )}
          {!desk.selected && Object.keys(desk.drafts).length > 0 && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm"
            >
              <p>U heeft nog een niet-opgeslagen beoordeling.</p>
              <Button variant="outline" onClick={desk.resumeDraft}>
                Verder bewerken
              </Button>
            </div>
          )}
          {desk.notice && (
            <p role="status" className="rounded-lg bg-primary/5 p-4 text-sm">
              {desk.notice}
            </p>
          )}
          {desk.loading ? (
            <div role="status" className="max-w-3xl space-y-4">
              <p>{u.loading}</p>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : desk.error && !desk.dossiers.length ? null : desk.selected ? (
            <BusinessDetail detail={desk.selected} />
          ) : desk.params.has("zaak") ? (
            <p role="alert">
              {u.unavailable}{" "}
              <Button variant="outline" onClick={desk.back}>
                {u.back}
              </Button>
            </p>
          ) : (
            children
          )}
          <footer className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
            <p>{nl.attribution}</p>
            <button
              className="mt-2 underline underline-offset-4"
              onClick={() => desk.navigate("sources")}
            >
              {u.about}
            </button>
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
export function BusinessSearch({ submit = false }: { submit?: boolean }) {
  const desk = useDesk();
  return (
    <form
      className="business-search w-full max-w-2xl space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        desk.navigate("street");
      }}
    >
      <Label htmlFor="business-search">{u.search}</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="absolute left-3 top-3 size-4 text-muted-foreground"
          />
          <Input
            id="business-search"
            aria-label={u.search}
            className="h-11 pl-10 text-base"
            placeholder="Bijvoorbeeld Paalstraat of Amplifon"
            value={desk.query}
            onChange={(e) => desk.setQuery(e.target.value)}
          />
        </div>
        {submit && (
          <Button type="submit" className="h-11">
            {u.find}
          </Button>
        )}
      </div>
      {submit && (
        <p className="text-sm text-muted-foreground">{u.searchHelp}</p>
      )}
    </form>
  );
}
export function BusinessViewTabs() {
  const desk = useDesk();
  return (
    <nav
      aria-label="Weergave zaken"
      className="flex gap-1 rounded-lg border p-1 w-fit"
    >
      <Button
        variant={desk.screen === "street" ? "secondary" : "ghost"}
        aria-current={desk.screen === "street" ? "page" : undefined}
        onClick={() => desk.navigate("street")}
      >
        <List className="size-4" />
        {u.list}
      </Button>
      <Button
        variant={desk.screen === "map" ? "secondary" : "ghost"}
        aria-current={desk.screen === "map" ? "page" : undefined}
        onClick={() => desk.navigate("map")}
      >
        <MapIcon className="size-4" />
        {u.map}
      </Button>
    </nav>
  );
}
export function OverviewView() {
  const desk = useDesk();
  const count = desk.queue.length;
  return (
    <div className="overview-layout">
      <section className="start-focus surface-panel">
        <div className="focus-top">
          <span className="focus-icon">
            <ClipboardCheck className="size-6" />
          </span>
          <StatusPill state={count ? "pending" : "approved"}>
            {count ? u.pendingStatus : u.noPending}
          </StatusPill>
        </div>
        <div className="focus-content">
          <h2>
            {count === 0
              ? u.noPending
              : count === 1
                ? "1 wijziging wacht op controle"
                : `${count} wijzigingen wachten op controle`}
          </h2>
          <p>
            {count
              ? "Bekijk wat mogelijk aangepast moet worden. U beslist op basis van de bronnen."
              : u.noPendingNote}
          </p>
          {count > 0 && (
            <Button
              className="mt-5"
              onClick={() => desk.openRecord(desk.queue[0], "review")}
            >
              {u.start}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
        <div className="focus-footer">
          <ShieldCheck className="size-4" />
          <span>{t.reviewTipNote}</span>
        </div>
      </section>
      <section className="start-search surface-panel">
        <div className="flex items-center gap-3">
          <span className="section-icon">
            <Search className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">{t.searchTitle}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t.searchDescription}</p>
        <BusinessSearch submit />
        <button
          className="explore-link"
          onClick={() => desk.navigate("street")}
        >
          <Building2 className="size-4" />
          {t.explore}
          <span>{desk.records.length}</span>
          <ArrowRight className="size-4" />
        </button>
      </section>
      {count > 0 && (
        <section className="start-queue surface-panel">
          <PanelTitle
            icon={<ClipboardCheck className="size-4" />}
            title={t.reviewQueue}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => desk.navigate("review")}
            >
              {t.viewAll}
              <ArrowRight className="size-4" />
            </Button>
          </PanelTitle>
          <div className="divide-y">
            {desk.queue.slice(0, 3).map((r) => (
              <button
                key={r.proposal!.id}
                onClick={() => desk.openRecord(r, "review")}
                className="business-item"
              >
                <BusinessAvatar name={r.naam} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.naam}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.adres}
                  </p>
                </div>
                <span className="field-chip">
                  <FieldIcon field={r.proposal!.field} />
                  {fieldLabel(r.proposal!.field)}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
      <aside className="coverage-strip">
        <CircleHelp className="size-5 shrink-0" />
        <p>{u.coverage}</p>
        <button onClick={() => desk.navigate("sources")}>
          {u.about}
          <ArrowRight className="size-4" />
        </button>
      </aside>
    </div>
  );
}
export function StreetView() {
  const desk = useDesk();
  const page = Math.max(
    0,
    Math.min(
      Number(desk.params.get("page")) || 0,
      Math.ceil(desk.rows.length / 15) - 1,
    ),
  );
  return (
    <div className="space-y-5">
      <div className="directory-toolbar surface-panel">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <BusinessSearch />
          <BusinessViewTabs />
        </div>
        <details className="max-w-xl">
          <summary className="cursor-pointer text-sm underline underline-offset-4">
            {u.filters}
            {desk.street ? ` · ${desk.street}` : ""}
          </summary>
          <label className="mt-3 block text-sm">
            {u.street}
            <select
              className="ml-3 rounded border bg-background px-3 py-2"
              value={desk.street}
              onChange={(e) => desk.setStreet(e.target.value)}
            >
              <option value="">{u.allStreets}</option>
              {desk.streets.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </details>
        {(desk.query || desk.street) && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span>
              {desk.query ? `Zoeken: ${desk.query}` : ""}{" "}
              {desk.street ? `· ${desk.street}` : ""}
            </span>
            <button
              className="underline"
              onClick={() =>
                desk.updateParams(
                  { q: null, street: null, page: null },
                  undefined,
                  true,
                )
              }
            >
              {u.clear}
            </button>
          </div>
        )}
      </div>
      <div className="surface-panel data-table-panel">
        <PanelTitle
          icon={<Building2 className="size-4" />}
          title={t.allRecords}
        >
          <span className="count-label">{desk.rows.length}</span>
        </PanelTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">{u.business}</TableHead>
              <TableHead>{u.address}</TableHead>
              <TableHead>{u.change}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {desk.rows.slice(page * 15, page * 15 + 15).map((r) => {
              const pending = r.detail.establishment.proposals.filter(
                (p) => p.reviewState === "pending",
              );
              return (
                <TableRow key={r.id}>
                  <TableCell className="max-w-80 whitespace-normal px-5 py-4">
                    <button
                      className="flex items-center gap-3 text-left text-sm font-semibold hover:text-primary"
                      onClick={() => desk.openRecord(r)}
                    >
                      <BusinessAvatar name={r.naam} />
                      <span>{r.naam}</span>
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {r.adres}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {pending.length > 0 ? (
                      <button
                        className="field-chip"
                        onClick={() => desk.openRecord(r)}
                      >
                        {pending.length === 1
                          ? `${fieldLabel(pending[0].field)} controleren`
                          : `${pending.length} wijzigingen`}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">
                        {u.noChange}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!desk.rows.length && (
          <div className="space-y-3 p-8 text-center">
            <p>
              Geen zaken gevonden{desk.query ? ` voor “${desk.query}”` : ""}.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                desk.updateParams(
                  { q: null, street: null, page: null },
                  undefined,
                  true,
                )
              }
            >
              {u.clear}
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 border-t p-4 text-sm">
          <span role="status">
            {desk.rows.length} zaken · Pagina {desk.rows.length ? page + 1 : 0}{" "}
            van {Math.ceil(desk.rows.length / 15)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={u.previous}
              disabled={!page}
              onClick={() =>
                desk.updateParams({ page: String(page - 1) }, undefined, true)
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={u.nextPage}
              disabled={(page + 1) * 15 >= desk.rows.length}
              onClick={() =>
                desk.updateParams({ page: String(page + 1) }, undefined, true)
              }
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{u.noChangeNote}</p>
    </div>
  );
}
export function ReviewView() {
  const desk = useDesk();
  return (
    <div className="review-queue space-y-5">
      {desk.queue.length ? (
        <>
          <p className="text-sm text-muted-foreground">
            {desk.queue.length}{" "}
            {desk.queue.length === 1 ? "voorstel" : "voorstellen"} · U beslist
            één wijziging tegelijk.
          </p>
          <div className="divide-y surface-panel">
            {desk.queue.map((r) => (
              <button
                key={r.proposal!.id}
                className="business-item"
                onClick={() => desk.openRecord(r, "review")}
              >
                <BusinessAvatar name={r.naam} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.naam}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.adres}
                  </p>
                  <span className="field-chip mt-3">
                    <FieldIcon field={r.proposal!.field} />
                    {fieldLabel(r.proposal!.field)} controleren
                  </span>
                </div>
                <ArrowRight className="size-4" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="empty-state">
            <ShieldCheck className="size-8" />
            <h2 className="text-lg font-medium">{u.noPending}</h2>
            <p className="text-sm text-muted-foreground">{u.noPendingNote}</p>
            <Button onClick={() => desk.navigate("street")}>{u.search}</Button>
          </div>
        </>
      )}
    </div>
  );
}
export function HistoryView() {
  const desk = useDesk();
  const [exportOpen, setExportOpen] = useState(false),
    [exportStreet, setExportStreet] = useState(""),
    [downloading, setDownloading] = useState(false),
    [failure, setFailure] = useState("");
  const approved = approvedChanges(desk.dossiers, exportStreet);
  const history = desk.dossiers
    .flatMap((detail) =>
      detail.reviews.map((review) => ({
        detail,
        review,
        proposal: detail.establishment.proposals.find(
          (p) => p.id === review.proposalId,
        ),
      })),
    )
    .sort((a, b) => b.review.reviewedAt.localeCompare(a.review.reviewedAt));
  async function download() {
    setDownloading(true);
    setFailure("");
    try {
      const params = new URLSearchParams({ municipality: "Schoten" });
      if (exportStreet) params.set("street", exportStreet);
      const blob = await (await api(`/api/export?${params}`)).blob();
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "straatbeeld-goedgekeurd.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : u.retry);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className="space-y-5">
      <Button
        variant="outline"
        onClick={() => setExportOpen(!exportOpen)}
        aria-expanded={exportOpen}
      >
        <Download className="size-4" />
        {u.export}
      </Button>
      {exportOpen && (
        <section className="export-panel surface-panel max-w-2xl space-y-4 p-6">
          <div className="flex gap-3">
            <span className="section-icon">
              <Download className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{t.downloadTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.downloadDescription}
              </p>
            </div>
          </div>
          <Label htmlFor="export-street">{u.exportScope}</Label>
          <select
            id="export-street"
            className="block w-full rounded-md border bg-background p-2 text-sm"
            value={exportStreet}
            onChange={(e) => setExportStreet(e.target.value)}
          >
            <option value="">{u.allStreets}</option>
            {desk.streets.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <p className="text-sm">{u.exportNote}</p>
          <p className="text-sm" role="status">
            {approved.length
              ? `${approved.length} ${approved.length === 1 ? "goedgekeurde wijziging" : "goedgekeurde wijzigingen"} · ${exportStreet || "Schoten"}`
              : u.noExport}
          </p>
          {failure && <p role="alert">{failure}</p>}
          <Button
            disabled={!approved.length || downloading}
            onClick={() => void download()}
          >
            {downloading ? "Downloaden…" : u.download}
          </Button>
        </section>
      )}
      {!history.length ? (
        <div className="space-y-2">
          <h2 className="text-lg">{u.historyEmpty}</h2>
          <p>{u.historyNote}</p>
        </div>
      ) : (
        <div className="surface-panel data-table-panel">
          <PanelTitle
            icon={<Clock3 className="size-4" />}
            title={t.historyTotal}
          >
            <span className="count-label">{history.length}</span>
          </PanelTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">{u.business}</TableHead>
                <TableHead>{u.historyChange}</TableHead>
                <TableHead>{u.decision}</TableHead>
                <TableHead>{u.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(({ detail, review: r, proposal: p }) => (
                <TableRow key={r.reviewId}>
                  <TableCell className="max-w-96 whitespace-normal px-5 py-4">
                    <p className="font-medium">{detail.establishment.name}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm underline underline-offset-4">
                        {u.details}
                      </summary>
                      <div className="mt-4 space-y-3 text-sm">
                        <p>
                          {u.employee}:{" "}
                          {r.reviewerId === desk.officerId
                            ? desk.officer
                            : (r.reviewerId ?? u.unknown)}
                        </p>
                        <p>
                          {u.revision}: {r.revision}
                        </p>
                        <p>{r.note ?? "Geen toelichting"}</p>
                        <p>Vestigingsnummer: {detail.establishment.id}</p>
                        <Evidence
                          items={evidenceGroups(detail, p?.evidenceIds ?? [])}
                        />
                      </div>
                    </details>
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {fieldLabel(p?.field ?? "")}
                    <div className="history-value">
                      <FieldValue
                        field={p?.field ?? ""}
                        value={
                          r.decision === "approve"
                            ? r.effectiveValue
                            : p?.proposedValue
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      state={r.decision === "approve" ? "approved" : "rejected"}
                    >
                      {r.decision === "approve" ? u.approved : u.rejected}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.reviewedAt).toLocaleString("nl-BE")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
export function SourcesView() {
  const { dossiers } = useDesk();
  const sources = [
    ...new Map(
      dossiers.flatMap((d) => d.sources).map((s) => [s.id, s]),
    ).values(),
  ];
  return (
    <div className="sources-layout space-y-6">
      <section className="surface-panel">
        <PanelTitle
          icon={<Building2 className="size-4" />}
          title={t.coverageTitle}
        />
        <div className="coverage-summary">
          <div>
            <strong>{dossiers.length}</strong>
            <span>{t.currentSample}</span>
          </div>
          <div>
            <strong>
              {dossiers.filter((d) => d.establishment.parent).length}
            </strong>
            <span>{t.linked}</span>
          </div>
          <div>
            <strong>
              {dossiers.filter((d) => !d.establishment.parent).length}
            </strong>
            <span>{t.missing}</span>
          </div>
        </div>
        <p className="border-t p-5 text-sm leading-relaxed text-muted-foreground">
          De aangeleverde steekproef bevat 1.000 registerrecords, waaronder{" "}
          {dossiers.length} lokale vestigingen. {t.coverageNote}
        </p>
      </section>
      <section className="surface-panel">
        <PanelTitle icon={<Clock3 className="size-4" />} title={t.dates} />
        <dl className="date-explainer">
          {[
            [t.fetched, t.fetchedNote],
            [t.observed, t.observedNote],
            [t.snapshot, t.snapshotNote],
          ].map(([label, note]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{note}</dd>
            </div>
          ))}
        </dl>
      </section>
      <aside className="coverage-strip">
        <ShieldCheck className="size-5 shrink-0" />
        <p>{u.officialNote}</p>
        <a
          className="text-sm underline"
          href="https://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/v1.0"
          target="_blank"
          rel="noreferrer"
        >
          Modellicentie Gratis Hergebruik v1.0
        </a>
      </aside>
      <Disclosure title={`Bronnenregister (${sources.length})`}>
        {sources.map((s) => (
          <div key={s.id} className="source-register-entry space-y-2">
            <a
              className="underline"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              {s.publisher}
            </a>
            <p>
              {u.fetched} {sourceDate(s.retrievedAt)}
            </p>
            <p>
              Waarnemingsdatum:{" "}
              {s.observedAt ? sourceDate(s.observedAt) : u.unknown} ·
              Registerpeildatum: {s.registrySnapshotDate ?? u.unknown}
            </p>
            <p className="break-all text-xs text-muted-foreground">{s.id}</p>
          </div>
        ))}
      </Disclosure>
    </div>
  );
}
export function StatesView() {
  return (
    <div className="space-y-5">
      <p>
        Deze pagina toont alleen ontwikkelvoorbeelden en staat niet in de
        medewerkersnavigatie.
      </p>
      <Disclosure title="Laden">
        <Skeleton className="h-20" />
      </Disclosure>
      <Disclosure title="Leeg">
        <p>{u.noPending}</p>
      </Disclosure>
      <Disclosure title="Fout">
        <p role="alert">
          De gegevens konden niet geladen worden. Probeer opnieuw.
        </p>
      </Disclosure>
    </div>
  );
}
