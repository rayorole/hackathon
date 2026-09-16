"use client";
import { DeskEmpty } from "./desk-empty";
import { emptyNl } from "@/lib/nl";
import { useMemo, useState } from "react";
import type { Detail } from "@straatbeeld/contracts";
import { ExternalLink, Database, Globe2, FileText, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { sourceDate } from "@/lib/officer-data";
import { sourcesNl as t, loadingNl, uxNl } from "@/lib/nl";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "./ui/table";

type Kind = "all" | Detail["sources"][number]["kind"];

export function SourcesRegistry({ dossiers }: { dossiers: Detail[] }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [page, setPage] = useState(0);
  const entries = useMemo(() => {
    const indexed = new Map<string, { source: Detail["sources"][number]; businesses: Map<string, string> }>();
    for (const detail of dossiers) {
      for (const source of detail.sources) {
        const entry = indexed.get(source.id) ?? { source, businesses: new Map<string, string>() };
        entry.businesses.set(detail.establishment.id, detail.establishment.name);
        indexed.set(source.id, entry);
      }
    }
    return [...indexed.values()].sort((a, b) => b.source.retrievedAt.localeCompare(a.source.retrievedAt));
  }, [dossiers]);
  const filtered = entries.filter(({ source, businesses }) =>
    (kind === "all" || source.kind === kind) &&
    `${source.publisher} ${source.url} ${[...businesses.values()].join(" ")}`.toLocaleLowerCase("nl-BE").includes(search.trim().toLocaleLowerCase("nl-BE")),
  );
  const pages = Math.ceil(filtered.length / 12);
  const current = Math.min(page, Math.max(0, pages - 1));
  return (
    <section className="surface-panel source-directory">
      <header className="source-directory-toolbar">
        <div>
          <h2 className="text-sm font-semibold">{t.directory}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{filtered.length} {loadingNl.sourceCount}</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={t.search} placeholder={t.search} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="h-10 border bg-card pl-9 pr-9" />
          {search && <Button variant="ghost" size="icon-sm" aria-label={uxNl.clear} onClick={() => { setSearch(""); setPage(0); }} className="absolute right-1 top-1/2 -translate-y-1/2"><X className="size-3.5" /></Button>}
        </div>
      </header>
      <div className="source-kind-filters" role="group" aria-label={t.type}>
        {(["all", "registry", "website", "observation"] as const).map((value) => (
          <Button key={value} size="sm" variant={kind === value ? "secondary" : "ghost"} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(0); }}>
            {value === "all" ? t.all : t.kinds[value]}
            <span className="text-xs text-muted-foreground">{entries.filter((entry) => value === "all" || entry.source.kind === value).length}</span>
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="pl-5">{t.linkedBusiness}</TableHead>
          <TableHead>{t.source}</TableHead>
          <TableHead>{t.retrieved}</TableHead>
          <TableHead>{t.observed}</TableHead>
          <TableHead><span className="sr-only">{t.open}</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.slice(current * 12, current * 12 + 12).map(({ source, businesses }) => {
            const names = [...businesses.values()];
            const Icon = source.kind === "registry" ? Database : source.kind === "website" ? Globe2 : FileText;
            return (
              <TableRow key={source.id}>
                <TableCell className="pl-5">
                  <div className="max-w-72 truncate text-sm font-medium" title={names.join(", ")}>{names[0]}</div>
                  {names.length > 1 && <p className="mt-1 text-xs text-muted-foreground">+{names.length - 1} {t.otherBusinesses}</p>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="source-symbol"><Icon className="size-4" aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="max-w-64 truncate text-xs font-medium" title={source.publisher}>{source.publisher.split(" — ")[0]}</p>
                      <p className="mt-1 max-w-64 truncate text-xs text-muted-foreground">{new URL(source.url).hostname}</p>
                      {source.isDemo && <span className="text-xs text-muted-foreground">{t.demo}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs tabular-nums">{sourceDate(source.retrievedAt)}
                  {source.registrySnapshotDate && <p className="mt-1 text-xs text-muted-foreground">{t.snapshot}: {sourceDate(source.registrySnapshotDate)}</p>}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-muted-foreground">{source.observedAt ? sourceDate(source.observedAt) : uxNl.unknown}</TableCell>
                <TableCell className="pr-5 text-right"><a href={source.url} target="_blank" rel="noreferrer" title={source.url} aria-label={`${t.open}: ${source.publisher} · ${names[0]}`} className="business-source-link">{t.open}<ExternalLink className="size-3.5" aria-hidden /></a></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!filtered.length && <DeskEmpty icon={<Database />} title={entries.length ? emptyNl.sourcesFiltered : t.empty} description={entries.length ? emptyNl.filtersNote : emptyNl.sourcesNote}>
        {(search || kind !== "all") && <Button variant="outline" onClick={() => { setSearch(""); setKind("all"); setPage(0); }}>{emptyNl.reset}</Button>}
      </DeskEmpty>}
      <footer className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
        <span role="status">{filtered.length ? current * 12 + 1 : 0}–{Math.min((current + 1) * 12, filtered.length)} / {filtered.length}</span>
        <div className="flex gap-2">
          <Button size="icon-sm" variant="outline" aria-label={loadingNl.previous} disabled={!current} onClick={() => setPage(current - 1)}><ChevronLeft /></Button>
          <Button size="icon-sm" variant="outline" aria-label={loadingNl.next} disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight /></Button>
        </div>
      </footer>
    </section>
  );
}
