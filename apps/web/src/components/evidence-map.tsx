"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Search,
  LocateFixed,
  RefreshCw,
  MapPin,
  X,
  Building2,
  Store,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { loadWorkspace } from "@/lib/officer-data";
import { apiFetch } from "@/lib/api";
import { mapNl as t, nl } from "@/lib/nl";
import {
  coordinateState,
  filterMapRecords,
  inMapBounds,
  toMapEntry,
  municipality,
  recordAddress,
  type MapEntry,
  type MapBounds,
} from "@/lib/map-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDesk } from "./desk-context";
import { BusinessViewTabs } from "./officer-desk";
import { MapRecordDetail } from "@/components/map-record-detail";
import { cn } from "@/lib/utils";

const MapCanvas = dynamic(() => import("@/components/evidence-map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      {t.mapLoading}
    </div>
  ),
});
const emptyEntries: MapEntry[] = [];

async function loadMapRecords(signal: AbortSignal): Promise<MapEntry[]> {
  const [details, response] = await Promise.all([
    loadWorkspace(),
    apiFetch("/api/locations", { signal }),
  ]);
  const locations = await response.json();
  return details.map((detail) => toMapEntry(detail, locations));
}

export function EvidenceMap() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MapWorkspace />
    </QueryClientProvider>
  );
}

export function MapWorkspace() {
  const records = useQuery({
    queryKey: ["map-records"],
    queryFn: ({ signal }) => loadMapRecords(signal),
    staleTime: 60_000,
  });
  const entries = records.data ?? emptyEntries;
  const desk = useDesk();
  const { query, setQuery } = desk;
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [selected, setSelected] = useState<MapEntry | null>(null);
  const [page, setPage] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const filtered = useMemo(
    () =>
      filterMapRecords(entries, query, "all", "all").filter(
        (e) => !desk.street || e.record.straat === desk.street,
      ),
    [entries, query, desk.street],
  );
  const located = useMemo(
    () => filtered.filter((e) => coordinateState(e.record) === "valid"),
    [filtered],
  );
  const shown = useMemo(
    () =>
      filtered.filter(
        (e) =>
          !visibleOnly ||
          !bounds ||
          coordinateState(e.record) !== "valid" ||
          inMapBounds(e.record, bounds),
      ),
    [filtered, visibleOnly, bounds],
  );
  const missing = filtered.filter(
    (e) => coordinateState(e.record) === "missing",
  ).length;
  const suspect = filtered.filter(
    (e) => coordinateState(e.record) === "suspect",
  ).length;
  const lastPage = Math.max(0, Math.ceil(shown.length / 25) - 1);
  const currentPage = Math.min(page, lastPage);
  const hasFilters = !!query || !!desk.street;
  function clear() {
    desk.updateParams({ q: null, street: null, page: null }, undefined, true);
    setPage(0);
    setSelected(null);
  }
  function filterChanged() {
    setPage(0);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BusinessViewTabs />
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={records.isFetching}
          onClick={() => void records.refetch()}
        >
          <RefreshCw
            className={cn("size-3.5", records.isFetching && "animate-spin")}
          />
          {records.isFetching ? t.refreshing : t.refresh}
        </Button>
      </div>
      {records.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {t.loadError}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void records.refetch()}
            >
              {t.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label={t.searchLabel}
              placeholder={t.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                filterChanged();
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!located.length}
            onClick={() => setFitRequest((n) => n + 1)}
          >
            <LocateFixed className="size-4" />
            {t.fit}
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.clear}
              onClick={clear}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative h-[440px] min-w-0 bg-muted sm:h-[540px] lg:h-[640px]">
            <MapCanvas
              entries={located}
              selected={selected}
              onSelect={setSelected}
              onBounds={setBounds}
              fitRequest={fitRequest}
            />
          </div>
          <aside
            aria-label={t.results}
            className="flex min-h-0 flex-col border-t lg:h-[640px] lg:border-l lg:border-t-0"
          >
            {selected ? (
              <MapRecordDetail
                entry={selected}
                onClose={() => setSelected(null)}
              />
            ) : (
              <>
                <div className="space-y-3 border-b p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{t.results}</h2>
                    <Badge variant="secondary" aria-live="polite">
                      {shown.length}
                    </Badge>
                  </div>
                  <Button
                    variant={visibleOnly ? "secondary" : "outline"}
                    size="sm"
                    aria-pressed={visibleOnly}
                    onClick={() => {
                      setVisibleOnly((v) => !v);
                      setPage(0);
                    }}
                  >
                    {t.visibleOnly}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t.selectNote}
                  </p>
                </div>
                <div
                  className="max-h-[400px] flex-1 overflow-y-auto lg:max-h-none"
                  aria-busy={records.isPending}
                >
                  {records.isPending ? (
                    <p
                      className="p-5 text-sm text-muted-foreground"
                      role="status"
                    >
                      {t.loading}
                    </p>
                  ) : !shown.length ? (
                    <div className="space-y-2 p-5">
                      <MapPin className="size-6 text-muted-foreground" />
                      <h3 className="text-sm font-medium">{t.empty}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {entries.length
                          ? t.emptyNote
                          : records.isError
                            ? t.loadError
                            : t.noData}
                      </p>
                      {hasFilters && (
                        <Button size="sm" variant="outline" onClick={clear}>
                          {t.clear}
                        </Button>
                      )}
                    </div>
                  ) : (
                    shown
                      .slice(currentPage * 25, currentPage * 25 + 25)
                      .map((entry) => {
                        const { record } = entry;
                        const state = coordinateState(record);
                        return (
                          <Button
                            key={record.ondernemingsnr}
                            variant="ghost"
                            onClick={() => setSelected(entry)}
                            className="h-auto w-full justify-start gap-3 rounded-none border-b px-4 py-4 text-left whitespace-normal"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              {record.kind === "vestiging" ? (
                                <Store className="size-4" />
                              ) : (
                                <Building2 className="size-4" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 space-y-1">
                              <span className="block truncate text-xs font-semibold">
                                {record.commercieleNaam ||
                                  record.naam ||
                                  t.noName}
                              </span>
                              <span className="block text-xs font-normal text-muted-foreground">
                                {recordAddress(record) || t.unknown}
                              </span>
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                {state === "missing"
                                  ? t.missing
                                  : state === "suspect"
                                    ? t.suspect
                                    : "Bekijk zaak"}
                              </span>
                            </span>
                            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                          </Button>
                        );
                      })
                  )}
                </div>
                {lastPage > 0 && (
                  <div className="flex items-center justify-between border-t p-2">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={!currentPage}
                      aria-label={t.previous}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <span className="text-xs">
                      {t.page} {currentPage + 1} / {lastPage + 1}
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={currentPage === lastPage}
                      aria-label={t.next}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
        <div
          className="flex flex-wrap gap-x-5 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span className="font-medium text-foreground">
            {located.length} {t.located}
          </span>
          <span>
            {missing} · {t.missing}
          </span>
          <span>
            {suspect} · {t.suspect}
          </span>
          <span className="ml-auto hidden md:inline">{t.help}</span>
        </div>
      </Card>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">Over deze kaart</summary>
        <div className="mt-3 space-y-2">
          <p>
            {t.registerNote} {t.unlocatedNote}
          </p>
          <p>
            {t.bboxNote} {t.noPublish}
          </p>
        </div>
      </details>
      <p className="text-[11px] text-muted-foreground">
        {nl.attribution}{" "}
        <a
          href="https://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/v1.0"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {municipality.dataset.licentie}
        </a>
      </p>
    </div>
  );
}
