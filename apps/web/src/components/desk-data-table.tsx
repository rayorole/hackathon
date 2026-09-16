"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Columns3, Plus, Search, X } from "lucide-react";
import { useTable, tableFeatures, rowSortingFeature, rowPaginationFeature, rowSelectionFeature, columnVisibilityFeature, createSortedRowModel, createPaginatedRowModel, sortFn_alphanumeric, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { tableNl as t } from "@/lib/nl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuGroup, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature, rowSelectionFeature, columnVisibilityFeature, sortedRowModel: createSortedRowModel(), paginatedRowModel: createPaginatedRowModel(), sortFns: { alphanumeric: sortFn_alphanumeric } });
export type DeskColumn<T> = { id: string; label: string; value: (row: T) => string | number; cell?: (row: T) => ReactNode; filter?: boolean; sortable?: boolean; required?: boolean };

export function DeskDataTable<T extends object>({ data, columns: definitions, getId, rowLabel, activeId }: {
  data: T[]; columns: DeskColumn<T>[]; getId: (row: T) => string; rowLabel: (row: T) => string; activeId?: string;
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [selectedOnly, setSelectedOnly] = useState(false);
  const selectionFilter = selectedOnly ? selection : null;
  const filtered = useMemo(() => data.filter((row) =>
    (!selectionFilter || selectionFilter[getId(row)]) &&
    definitions.some((column) => String(column.value(row)).toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl"))) &&
    definitions.every((column) => filters[column.id] === undefined || String(column.value(row)) === filters[column.id])
  ), [data, definitions, filters, search, selectionFilter, getId]);
  const selectedCount = data.filter((row) => selection[getId(row)]).length;
  const visibleSelected = filtered.filter((row) => selection[getId(row)]).length;
  const columns = useMemo<ColumnDef<typeof features, T>[]>(() => [
    { id: "selection", enableSorting: false, enableHiding: false,
      header: ({ table }) => <Checkbox aria-label={t.selectPage} checked={table.getIsAllPageRowsSelected()} indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)} />,
      cell: ({ row }) => <Checkbox aria-label={`${t.selectRow}: ${rowLabel(row.original)}`} checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(checked)} />,
    },
    ...definitions.map((definition): ColumnDef<typeof features, T> => ({
      id: definition.id, accessorFn: definition.value, header: definition.label,
      enableSorting: definition.sortable !== false, enableHiding: !definition.required, sortFn: "alphanumeric",
      cell: ({ row }) => definition.cell?.(row.original) ?? String(definition.value(row.original)),
    })),
  ], [definitions, rowLabel]);
  const table = useTable({ features, data: filtered, columns, getRowId: getId,
    state: { rowSelection: selection, pagination }, onRowSelectionChange: setSelection, onPaginationChange: setPagination,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });
  const changeFilter = (id: string, value?: string) => {
    setFilters((current) => { const next = { ...current }; if (value === undefined) delete next[id]; else next[id] = value; return next; });
    table.setPageIndex(0);
  };
  const reset = () => { setFilters({}); setSearch(""); setSelectedOnly(false); table.setPageIndex(0); };
  const clearSelection = () => { setSelection({}); setSelectedOnly(false); table.setPageIndex(0); };
  return <div>
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <div className="relative w-full sm:w-56"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input aria-label={t.search} placeholder={t.search} value={search} onChange={(event) => { setSearch(event.target.value); table.setPageIndex(0); }} className="h-8 pl-8 text-xs!" /></div>
      {Object.entries(filters).map(([id, value]) => {
        const definition = definitions.find((column) => column.id === id)!;
        return <div key={id} className="flex h-8 max-w-full items-center overflow-hidden rounded-lg border bg-card text-xs">
          <span className="border-r px-2 font-medium">{definition.label}</span><span className="px-2 text-muted-foreground">{t.is}</span>
          <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="min-w-0 gap-1 rounded-none px-2 text-xs" />}><span className="max-w-44 truncate">{value}</span><ChevronDown className="size-3" /></DropdownMenuTrigger>
            <DropdownMenuContent>{[...new Set(data.map((row) => String(definition.value(row))))].sort().map((option) => <DropdownMenuItem key={option} onClick={() => changeFilter(id, option)}>{option || t.unknown}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" aria-label={`${t.removeFilter}: ${definition.label}`} onClick={() => changeFilter(id)} className="shrink-0 rounded-none border-l"><X className="size-3" /></Button>
        </div>;
      })}
      <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" size="sm" />}><Plus className="size-3.5" />{t.addFilter}</DropdownMenuTrigger><DropdownMenuContent className="max-h-80 w-72">
        {definitions.filter((column) => column.filter).map((column) => <DropdownMenuGroup key={column.id}><DropdownMenuLabel>{column.label}</DropdownMenuLabel>{[...new Set(data.map((row) => String(column.value(row))))].sort().map((value) => <DropdownMenuItem key={value} onClick={() => changeFilter(column.id, value)}>{value || t.unknown}</DropdownMenuItem>)}</DropdownMenuGroup>)}
      </DropdownMenuContent></DropdownMenu>
      {(search || Object.keys(filters).length > 0 || selectedOnly) && <Button variant="ghost" size="sm" onClick={reset}>{t.clearFilters}</Button>}
      <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" size="sm" className="ml-auto" />}><Columns3 className="size-3.5" />{t.columns}</DropdownMenuTrigger><DropdownMenuContent align="end">
        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(checked) => column.toggleVisibility(checked)}>{definitions.find((definition) => definition.id === column.id)?.label}</DropdownMenuCheckboxItem>)}
      </DropdownMenuContent></DropdownMenu>
    </div>
    {selectedCount > 0 && <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs"><span className="mr-auto" role="status">{selectedCount} {t.selected} · {visibleSelected} {t.withinFilters}</span><Button variant={selectedOnly ? "secondary" : "outline"} aria-pressed={selectedOnly} size="xs" onClick={() => { setSelectedOnly(!selectedOnly); table.setPageIndex(0); }}>{t.selectedOnly}</Button><Button variant="ghost" size="xs" onClick={clearSelection}>{t.clearSelection}</Button></div>}
    <Table className="text-xs"><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined} className="px-3 text-xs">
      {header.column.getCanSort() ? <Button variant="ghost" size="xs" className="-ml-2 text-xs" onClick={header.column.getToggleSortingHandler()}><table.FlexRender header={header} />{header.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : header.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}</Button> : <table.FlexRender header={header} />}
    </TableHead>)}</TableRow>)}</TableHeader><TableBody>
      {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() || row.id === activeId ? "selected" : undefined}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="max-w-72 whitespace-normal px-3"><table.FlexRender cell={cell} /></TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="h-32 text-center"><p className="text-muted-foreground">{t.noResults}</p><Button variant="link" size="sm" onClick={reset}>{t.clearFilters}</Button></TableCell></TableRow>}
    </TableBody></Table>
    <div className="flex flex-wrap items-center gap-3 border-t px-3 py-3 text-xs text-muted-foreground">
      <span className="mr-auto tabular-nums" role="status">{filtered.length} {t.of} {data.length} {t.records}</span>
      <label className="flex items-center gap-2">{t.perPage}<NativeSelect size="sm" value={pagination.pageSize} onChange={(event) => { table.setPageSize(Number(event.target.value)); table.setPageIndex(0); }}>{[5, 10, 25, 50].map((size) => <NativeSelectOption key={size} value={size}>{size}</NativeSelectOption>)}</NativeSelect></label>
      <span className="tabular-nums">{t.page} {filtered.length ? pagination.pageIndex + 1 : 0} {t.of} {table.getPageCount()}</span>
      <Button variant="outline" size="icon-sm" aria-label={t.previous} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft /></Button><Button variant="outline" size="icon-sm" aria-label={t.next} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight /></Button>
    </div>
  </div>;
}
