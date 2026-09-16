"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, Command as CommandIcon, CornerDownLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { deskRoutes, type DeskScreen } from "@/lib/desk-routes";
import { demoRecords, type DemoRecord } from "@/lib/officer-demo";
import { commandNl as c, deskNl as t } from "@/lib/nl";

export function DeskCommandBar({ onNavigate, onSearch, onOpenRecord }: {
  onNavigate: (screen: DeskScreen) => void;
  onSearch: (query: string) => void;
  onOpenRecord: (record: DemoRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.repeat) {
        event.preventDefault();
        setQuery("");
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  const streets = [...new Set(demoRecords.map((record) => record.adres.replace(/ \d+$/, "")))];

  return (
    <>
      <Button ref={trigger} variant="outline" aria-haspopup="dialog" aria-expanded={open}
        aria-label={c.title} onClick={() => { setQuery(""); setOpen(true); }}
        className="min-w-0 flex-1 justify-start gap-2.5 font-normal text-muted-foreground sm:max-w-[420px]">
        <CommandIcon className="size-4 text-primary" />
        <span className="truncate">{c.trigger}</span>
        <Kbd className="ml-auto hidden shrink-0 text-[10px] sm:inline-flex">Ctrl / ⌘ K</Kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent finalFocus={trigger} showCloseButton={false} className="desk-command-dialog top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b bg-muted/40 px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-sm"><CommandIcon className="size-4 text-primary" />{c.title}</DialogTitle>
            <DialogDescription className="text-xs">{c.description}</DialogDescription>
          </DialogHeader>
          <Command className="desk-command">
            <CommandInput autoFocus value={query} onValueChange={setQuery} placeholder={c.placeholder} aria-label={c.placeholder} />
            <CommandList className="max-h-[min(50vh,360px)]">
              <CommandEmpty>{c.empty}</CommandEmpty>
              <CommandGroup heading={c.search}>
                <CommandItem value={c.allRecords} onSelect={() => run(() => onSearch(""))}>
                  <Building2 />{c.allRecords}
                </CommandItem>
                {query.trim() && <CommandItem value={`${c.search} ${query}`} onSelect={() => run(() => onSearch(query.trim()))}>
                  <ArrowUpRight /><span>{c.searchFor} “{query.trim()}”</span>
                </CommandItem>}
                {streets.map((street) => <CommandItem key={street} value={street} onSelect={() => run(() => onSearch(street))}>
                  <MapPin />{street}
                </CommandItem>)}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading={c.navigation}>
                {(Object.keys(deskRoutes) as DeskScreen[]).map((screen) => <CommandItem key={screen} value={t.nav[screen]} onSelect={() => run(() => onNavigate(screen))}>
                  <ArrowUpRight />{t.nav[screen]}
                </CommandItem>)}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading={c.records}>
                {demoRecords.map((record) => <CommandItem key={record.adres} value={`${record.naam} ${record.adres} ${record.ondNr} ${record.vestNr}`} onSelect={() => run(() => onOpenRecord(record))}>
                  <Building2 className="text-muted-foreground" />
                  <span className="min-w-0"><span className="block truncate">{record.naam}</span><span className="block truncate text-xs font-normal text-muted-foreground">{record.adres} · {record.soort}</span></span>
                </CommandItem>)}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex flex-wrap items-center gap-3 border-t bg-muted/40 px-4 py-2.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Kbd>↑ ↓</Kbd>{c.move}</span>
            <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft /></Kbd>{c.open}</span>
            <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd>{c.close}</span>
            <span className="ml-auto">{t.demo}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
