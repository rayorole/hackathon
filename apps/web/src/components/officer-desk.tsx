"use client";
import { DeskEmpty } from "./desk-empty";
import { emptyNl } from "@/lib/nl";
import Image from "next/image";
import Link from "next/link";
import { PrioritySummary } from "./control-insights";
import { ReportBusiness, CandidateList } from "./candidate-businesses";
import { AnimatedDisclosure } from "./animated-disclosure";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { polishNl as polish } from "@/lib/nl";
import { useMutation } from "@tanstack/react-query";
import { DeskQueryProvider } from "./desk-query-provider";
import { DeskSkeleton, LoadingStatus } from "./desk-loading";
import { SourcesRegistry } from "./sources-registry";
import { loadingNl as loadingText } from "@/lib/nl";
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
import { api, fieldLabel, toRecord } from "@/lib/officer-data";
import { normalizedField, approvedChanges } from "@/lib/review-presentation";
import { uxNl as u } from "@/lib/nl";
import { OfficerSidebar } from "./officer-sidebar";
import { DeskCommandBar } from "./desk-command-bar";
import { DeskProvider, useDesk } from "./desk-context";
import { BusinessDetail, Disclosure } from "./business-detail";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { municipality } from "@/lib/map-data";
import { deskRoutes } from "@/lib/desk-routes";
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
    <DeskQueryProvider key={officerId}>
      <DeskProvider officer={officer} officerId={officerId}>
        <DeskShell defaultOpen={defaultOpen}>{children}</DeskShell>
      </DeskProvider>
    </DeskQueryProvider>
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
      style={{ "--sidebar-width": "224px" } as React.CSSProperties}
    >
      <OfficerSidebar
        officer={desk.officer}
        queueCount={desk.queue.length + desk.candidates.filter(c => c.status === "pending").length}
        recordCount={desk.records.length}
        onNavigate={desk.navigate}
        onBeforeLeave={desk.guard}
      />
      <SidebarInset className="min-w-0 bg-background">
        <header className="workspace-topbar flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="hidden h-4 sm:block"
          />
          {/* Municipality comes from config/municipality.json, never a literal —
              swapping municipality must not require a code change (AGENTS.md §6). */}
          <Breadcrumb className="min-w-0">
            {/* flex-nowrap: the default list wraps, which would burst a fixed-height bar. */}
            <BreadcrumbList className="flex-nowrap sm:gap-1.5">
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={deskRoutes.overview} />}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                >
                  <MapPin className="size-3.5 shrink-0" />
                  {municipality.naam}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden shrink-0 sm:block" />
              <BreadcrumbItem className="hidden min-w-0 sm:block">
                <BreadcrumbPage className="block truncate">
                  {u.titles[desk.screen]}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {desk.fetching && !desk.loading && (
            <LoadingStatus label={loadingText.refreshing} />
          )}
          {/* Search stays reachable on phones — the trigger already hides its
              keyboard hint and truncates its label below sm. */}
          <div className="ml-auto flex min-w-0 justify-end">
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
          {!desk.selected && desk.screen !== "overview" && (
            <header className="page-heading">
              <h1 className="text-2xl font-semibold tracking-tight">
                {u.titles[desk.screen]}
              </h1>
              {!["street", "map"].includes(desk.screen) && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {desk.screen === "review"
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
            <DeskSkeleton detail={desk.params.has("zaak")} />
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
      className="business-search min-w-0 flex-1 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        desk.navigate("street");
      }}
    >
      <Label className="sr-only" htmlFor="business-search">{u.search}</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="business-search"
            aria-label={u.search}
            className="h-10 pl-10 pr-10 text-sm"
            placeholder={polish.searchPlaceholder}
            value={desk.query}
            onChange={(e) => desk.setQuery(e.target.value)}
          />
          {desk.query && <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={polish.clearSearch} onClick={() => desk.setQuery("")}><X className="size-3.5" /></Button>}
        </div>
        {submit && (
          <Button type="submit" className="h-10">
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
      className="view-switch flex shrink-0 gap-1 rounded-lg bg-muted p-1 w-fit"
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
      <section className="home-search-hero">
        <Image className="home-hero-image" src="/images/straatbeeld-street.webp" alt="" fill sizes="100vw" priority />
        <div className="home-hero-content">
          <h1>{t.searchTitle}</h1>
          <p>{t.searchDescription}</p>
          <BusinessSearch submit />
          <Button variant="outline" className="home-browse-button" onClick={() => desk.guard(() => desk.updateParams({ q: null, street: null, page: null, zaak: null, voorstel: null }, "street"))}>
            <Building2 className="size-4" />
            {polish.allBusinesses}
            <span className="text-muted-foreground">{desk.records.length}</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
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
                <BusinessAvatar name={r.naam} seed={r.id} />
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
        <div className="directory-search-row">
          <BusinessSearch />
          <BusinessViewTabs />
          <ReportBusiness />
        </div>
        <div className="directory-filter-row">
          <AnimatedDisclosure label={<><SlidersHorizontal className="size-3.5" />{u.filters}{desk.street && <span className="filter-count">1</span>}</>} className="street-filter">
            <Label htmlFor="street-filter">{u.street}</Label>
            <Select value={desk.street} onValueChange={(value) => desk.setStreet(value ?? "")}>
              <SelectTrigger id="street-filter" className="mt-2 w-full"><SelectValue>{desk.street || u.allStreets}</SelectValue></SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="">{u.allStreets}</SelectItem>
                {desk.streets.map((street) => <SelectItem key={street} value={street}>{street}</SelectItem>)}
              </SelectContent>
            </Select>
          </AnimatedDisclosure>
          {desk.street && <Button variant="secondary" size="sm" onClick={() => desk.setStreet("")} aria-label={polish.removeStreet + ": " + desk.street}>{desk.street}<X className="size-3" /></Button>}
          {(desk.query || desk.street) && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => desk.updateParams({ q: null, street: null, page: null }, undefined, true)}>{u.clear}</Button>}
        </div>
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
                  <TableCell className="max-w-80 px-5 py-3">
                    <button
                      className="business-cell flex min-w-0 max-w-full items-center gap-3 text-left text-sm font-medium hover:text-primary"
                      title={r.naam}
                      onClick={() => desk.openRecord(r)}
                    >
                      <BusinessAvatar name={r.naam} seed={r.id} />
                      <span className="truncate">{r.naam}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{r.adres}</TableCell>
                  <TableCell className="text-sm">
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
                      <span className="text-muted-foreground" aria-label={u.noChange} title={u.noChange}>
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!desk.rows.length && !desk.matchingCandidates.length && (
          <DeskEmpty icon={<Search />} title={emptyNl.companies} description={desk.query || desk.street ? emptyNl.filtersNote : emptyNl.companiesNote}>
            {(desk.query || desk.street) && <Button variant="outline" onClick={() => desk.updateParams({ q: null, street: null, page: null }, undefined, true)}>{emptyNl.reset}</Button>}
          </DeskEmpty>
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
      <CandidateList mode="approved" />
      <p className="text-sm text-muted-foreground">{u.noChangeNote}</p>
    </div>
  );
}
export function ReviewView() {
  const desk = useDesk();
  return (
    <div className="review-queue space-y-5">
      <CandidateList mode="pending" />
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
                <BusinessAvatar name={r.naam} seed={r.id} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.naam}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.adres}
                  </p>
                  <PrioritySummary detail={r.detail} proposalId={r.proposal?.id} />
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
      ) : desk.candidatesLoading || desk.candidatesError || desk.candidates.some(c => c.status === "pending") ? null : (
        <>
          <DeskEmpty icon={<ShieldCheck />} title={u.noPending} description={u.noPendingNote} className="border bg-card">
            <Button variant="outline" onClick={() => desk.navigate("street")}>{polish.allBusinesses}</Button>
          </DeskEmpty>
        </>
      )}
    </div>
  );
}
export function HistoryView() {
  const desk = useDesk();
  const [exportStreet, setExportStreet] = useState(""),
    [failure, setFailure] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const exportMutation = useMutation({
    mutationFn: async (street: string) => {
      const params = new URLSearchParams({ municipality: "Schoten" });
      if (street) params.set("street", street);
      return (await api(`/api/export?${params}`)).blob();
    },
  });
  const downloading = exportMutation.isPending;
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
    setFailure("");
    try {
      const blob = await exportMutation.mutateAsync(exportStreet);
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "straatbeeld-goedgekeurd.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : u.retry);
    }
  }
  return (
    <div className="space-y-5">
      <CandidateList mode="history" />
      <AnimatedDisclosure label={<><Download className="size-4" />{u.export}</>}>
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
            {downloading ? (
              <LoadingStatus label={loadingText.downloading} />
            ) : (
              u.download
            )}
          </Button>
        </section>
      </AnimatedDisclosure>
      {!history.length ? (
        !desk.candidatesLoading && !desk.candidatesError && !desk.candidates.some(c => c.status !== "pending") && <DeskEmpty icon={<Clock3 />} title={u.historyEmpty} description={u.historyNote} className="border bg-card" />
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
              {history.slice(historyPage * 15, historyPage * 15 + 15).map(({ detail, review: r, proposal: p }) => (
                <TableRow key={r.reviewId}>
                  <TableCell className="max-w-96 whitespace-normal px-5 py-4">
                    <Link
                      href={`/straatbeeld?zaak=${encodeURIComponent(detail.establishment.id)}`}
                      onClick={(event) => {
                        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                        event.preventDefault();
                        desk.openRecord(toRecord(detail));
                      }}
                      className="flex items-center gap-3 rounded-md font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      title={detail.establishment.name}
                    >
                      <BusinessAvatar name={detail.establishment.name} seed={detail.establishment.id} />
                      <span className="truncate">{detail.establishment.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {fieldLabel(p?.field ?? "")}
                    {normalizedField(p?.field ?? "") === "openinghours" ? (
                      <AnimatedDisclosure label={polish.hoursSummary} compact className="history-value">
                        <FieldValue field={p?.field ?? ""} value={r.decision === "approve" ? r.effectiveValue : p?.proposedValue} />
                      </AnimatedDisclosure>
                    ) : (
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {(r.decision === "approve" ? r.effectiveValue : p?.proposedValue) || t.notKnown}
                      </p>
                    )}
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
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>
              {history.length} {loadingText.decisions} · {historyPage + 1} /{" "}
              {Math.ceil(history.length / 15)}
            </span>
            <div className="flex gap-2">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={u.previous}
                disabled={!historyPage}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={u.nextPage}
                disabled={(historyPage + 1) * 15 >= history.length}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function SourcesView() {
  const { dossiers } = useDesk();
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
      <SourcesRegistry dossiers={dossiers} />
      <p className="text-xs text-muted-foreground">{polish.avatarNote}</p>
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
