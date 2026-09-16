"use client";
import { useEffect, useState } from "react";
import { monitoringSchema, type Monitoring } from "@straatbeeld/contracts";
import { Activity, Pause, Play, Radar, ChevronDown } from "lucide-react";
import { useDesk } from "./desk-context";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
const labels: Record<string, string> = {
  queued: "In wachtrij",
  running: "Wordt onderzocht",
  checked: "Bronnen gecontroleerd",
  no_source: "Geen passende bron",
  failed: "Opnieuw proberen",
  budget_blocked: "Wacht op onderzoeksruimte",
};
export function MunicipalMonitoring() {
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
  return (
    <section
      className="surface-panel col-span-full overflow-hidden"
      style={{ gridColumn: "1 / -1" }}
      aria-label="Gemeentelijk onderzoek"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="section-icon">
            <Radar className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Onderzoek in heel Schoten</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alle bekende zaken in één periodieke onderzoekswachtrij.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-2 text-sm">
          <Activity className="size-4" />
          {!data
            ? "Status ophalen…"
            : !data.online
              ? "Worker offline"
              : data.paused
                ? "Gepauzeerd"
                : "Onderzoek actief"}
        </span>
      </div>
      {error && (
        <p role="alert" className="px-6 pt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4 md:p-6">
            {[
              [data.total, "Zaken in beeld"],
              [data.checked, "Bronnen gecontroleerd"],
              [data.queued + data.running, "In onderzoekswachtrij"],
              [
                data.noSource + data.failed + data.blocked,
                "Vragen nog aandacht",
              ],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border bg-muted/30 p-4">
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 md:px-6">
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              aria-label={`${data.checked} van ${data.total} zaken met gecontroleerde bronnen`}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${data.total ? (100 * data.checked) / data.total : 0}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Broncontrole is geen bevestiging dat een zaak actief is. Dit is
              een gedeeltelijke KBO-selectie; wijzigingen vereisen uw
              goedkeuring.
            </p>
            {!data.online && (
              <p className="mt-3 rounded-lg border p-3 text-sm">
                Automatisch onderzoek wacht tot de lokale worker weer draait.
                Eerdere resultaten blijven beschikbaar.
              </p>
            )}
            {data.researchStarted >= data.researchLimit &&
              data.researchLimit > 0 && (
                <p className="mt-3 rounded-lg border p-3 text-sm">
                  De eerste onderzoekstranche ({data.researchLimit} zaken) is
                  benut. De overige onderzoeken wachten op uitbreiding binnen
                  het gedeelde AI-budget van $10.
                </p>
              )}
            <details className="mt-5 rounded-xl border">
              <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
                Onderzoekswachtrij en planning
                <ChevronDown className="size-4" />
              </summary>
              <div className="space-y-4 border-t p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Planning elke minuut · hercontrole na 7 dagen · zonder bron
                    na 30 dagen.
                    <br />
                    Laatste planning:{" "}
                    {data.lastPlannedAt
                      ? new Date(data.lastPlannedAt).toLocaleString("nl-BE")
                      : "Nog niet gestart"}
                    <br />
                    Handelaarsgids: {data.directoryCandidates} vermeldingen;
                    niet automatisch toegevoegd.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !data.total}
                    onClick={toggle}
                  >
                    {data.paused ? (
                      <Play className="size-4" />
                    ) : (
                      <Pause className="size-4" />
                    )}
                    {data.paused ? "Hervatten" : "Pauzeren"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Input
                    aria-label="Zoek in onderzoekswachtrij"
                    placeholder="Zoek een zaak in de wachtrij"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <select
                    aria-label="Onderzoeksstatus"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(0);
                    }}
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Alle statussen</option>
                    {Object.entries(labels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <ul className="divide-y">
                  {jobs.slice(page * 10, page * 10 + 10).map((x) => (
                    <li key={x.id} className="py-3">
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => {
                            const row = desk.records.find((r) => r.id === x.id);
                            if (row) desk.openRecord(row, "street");
                          }}
                        >
                          {x.name}
                        </button>
                        <span className="text-muted-foreground">
                          {labels[x.status] ?? x.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {x.message ?? "Wacht op de volgende onderzoeksronde."}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {jobs.length} zaken · pagina {page + 1} van{" "}
                    {Math.max(1, Math.ceil(jobs.length / 10))}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!page}
                      onClick={() => setPage(page - 1)}
                    >
                      Vorige
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(page + 1) * 10 >= jobs.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Volgende
                    </Button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
