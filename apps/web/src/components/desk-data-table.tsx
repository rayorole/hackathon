"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useTable, tableFeatures, rowSortingFeature, rowPaginationFeature, createSortedRowModel, createPaginatedRowModel, sortFn_alphanumeric, type ColumnDef } from "@tanstack/react-table";
import { tableNl as t } from "@/lib/nl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature, sortedRowModel: createSortedRowModel(), paginatedRowModel: createPaginatedRowModel(), sortFns: { alphanumeric: sortFn_alphanumeric } });
export type DeskColumn<T> = { id: string; label: string; value: (row: T) => string | number; cell?: (row: T) => ReactNode; filter?: boolean; sortable?: boolean; required?: boolean };

export function DeskDataTable<T extends object>({ data, columns: definitions, getId, activeId, searchValue, onSearchChange, searchLabel = t.search }: {
  data: T[]; columns: DeskColumn<T>[]; getId: (row: T) => string; activeId?: string;
  searchValue?: string; onSearchChange?: (value: string) => void; searchLabel?: string;
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [localSearch, setLocalSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const search = searchValue ?? localSearch;
  const filtered = useMemo(() => data.filter((row) =>
    (searchValue !== undefined || definitions.some((column) => String(column.value(row)).toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl")))) &&
    definitions.every((column) => !filters[column.id] || String(column.value(row)) === filters[column.id])
  ), [data, definitions, searchValue, search, filters]);
  const columns = useMemo<ColumnDef<typeof features, T>[]>(() => definitions.map((definition) => ({
    id: definition.id, accessorFn: definition.value, header: definition.label,
    enableSorting: definition.sortable !== false, sortFn: "alphanumeric",
    cell: ({ row }) => definition.cell?.(row.original) ?? String(definition.value(row.original)),
  })), [definitions]);
  // Keep a valid page when the data changes after a decision or an external search.
  const lastPage = Math.max(0, Math.ceil(filtered.length / pagination.pageSize) - 1);
  const currentPage = Math.min(pagination.pageIndex, lastPage);
  const table = useTable({ features, data: filtered, columns, getRowId: getId,
    autoResetPageIndex: false,
    state: { pagination: { ...pagination, pageIndex: currentPage } }, onPaginationChange: setPagination,
  });
  const setSearch = (value: string) => {
    setLocalSearch(value); onSearchChange?.(value); table.setPageIndex(0);
  };
  const reset = () => { setFilters({}); setSearch(""); };
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filterColumns = definitions.filter((column) => column.filter);
  return <div>
    <Collapsible>
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <div className="min-w-0 flex-1 basis-64 space-y-2"><Label htmlFor="table-search">{searchLabel}</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="table-search" placeholder={searchLabel} value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" /></div></div>
        {!!filterColumns.length && <CollapsibleTrigger render={<Button variant="outline" className="h-10" />}><SlidersHorizontal className="size-4" />{t.filters}{activeFilters > 0 && ` (${activeFilters})`}</CollapsibleTrigger>}
        {(search || activeFilters > 0) && <Button variant="ghost" className="h-10" onClick={reset}>{t.clearFilters}</Button>}
      </div>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-4 border-b bg-muted/30 p-4">{filterColumns.map((column) => <label key={column.id} className="min-w-40 space-y-2 text-sm"><span className="block font-medium">{column.label}</span><NativeSelect value={filters[column.id] ?? ""} onChange={(event) => { setFilters((current) => ({ ...current, [column.id]: event.target.value })); table.setPageIndex(0); }}><NativeSelectOption value="">{t.all}</NativeSelectOption>{[...new Set(data.map((row) => String(column.value(row))))].filter(Boolean).sort().map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}</NativeSelect></label>)}</div>
      </CollapsibleContent>
    </Collapsible>
    <Table className="text-sm"><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined} className="px-4 text-xs">
      {header.column.getCanSort() ? <Button variant="ghost" size="sm" className="-ml-2 h-auto whitespace-normal px-2 py-2 text-left text-xs" onClick={header.column.getToggleSortingHandler()}><table.FlexRender header={header} />{header.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : header.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : null}</Button> : <table.FlexRender header={header} />}
    </TableHead>)}</TableRow>)}</TableHeader><TableBody>
      {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.id === activeId ? "selected" : undefined}>{row.getAllCells().map((cell) => <TableCell key={cell.id} className="max-w-72 whitespace-normal px-4"><table.FlexRender cell={cell} /></TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={definitions.length} className="h-40 text-center"><p className="text-muted-foreground">{t.noResults}</p><Button variant="link" onClick={reset}>{t.clearFilters}</Button></TableCell></TableRow>}
    </TableBody></Table>
    <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <span className="mr-auto tabular-nums" role="status">{filtered.length} {filtered.length === 1 ? t.record : t.records}</span>
      {table.getPageCount() > 1 && <><span className="tabular-nums">{t.page} {currentPage + 1} {t.of} {table.getPageCount()}</span><Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft />{t.previous}</Button><Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{t.next}<ChevronRight /></Button></>}
    </div>
  </div>;
}
