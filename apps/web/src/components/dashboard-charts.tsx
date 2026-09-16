"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { type DemoRecord } from "@/lib/officer-demo";
import { chartNl as t } from "@/lib/nl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const levels = ["Hoog", "Middel", "Laag"] as const;
const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const config = {
  count: { label: t.records, color: "var(--chart-1)" },
  Hoog: { label: t.high, color: colors[0] },
  Middel: { label: t.medium, color: colors[1] },
  Laag: { label: t.low, color: colors[2] },
} satisfies ChartConfig;

export function DashboardCharts({ records, queue, onOpenRecord, onOpenStreet }: {
  records: DemoRecord[];
  queue: DemoRecord[];
  onOpenRecord: (record: DemoRecord) => void;
  onOpenStreet: (street: string) => void;
}) {
  const [level, setLevel] = useState<DemoRecord["zekerheid"] | null>(null);
  const [scope, setScope] = useState("all");
  const confidence = levels.map((name, index) => ({
    name, count: records.filter((record) => record.zekerheid === name).length, fill: colors[index],
  }));
  const selectedRecords = level ? records.filter((record) => record.zekerheid === level) : [];
  const visible = scope === "open" ? queue : records;
  const streetNames = [...new Set(records.map((record) => record.adres.replace(/ \d+$/, "")))];
  const streets = streetNames.map((name) => ({
    name, count: visible.filter((record) => record.adres.replace(/ \d+$/, "") === name).length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "nl"));
  const chooseLevel = (name: string) => {
    const next = levels.find((value) => value === name);
    if (next) setLevel((current) => current === next ? null : next);
  };

  return (
    <section aria-label={t.section} className="grid items-start gap-5 xl:grid-cols-2">
      <Card className="min-w-0 gap-0 overflow-hidden border py-0 shadow-xs ring-0">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3"><CardTitle>{t.confidenceTitle}</CardTitle><Badge variant="outline">{t.demo}</Badge></div>
          <CardDescription className="text-xs">{t.confidenceNote}</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-center gap-5">
            <div className="relative shrink-0">
              <ChartContainer config={config} className="size-52 aspect-square" aria-label={t.confidenceTitle}>
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={confidence} dataKey="count" nameKey="name" innerRadius={66} outerRadius={90} paddingAngle={3} strokeWidth={0} isAnimationActive={false} onClick={(entry) => chooseLevel(String(entry.name))} className="cursor-pointer">
                    {confidence.map((entry) => <Cell key={entry.name} fill={entry.fill} opacity={!level || level === entry.name ? 1 : 0.25} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
                <span className="font-heading text-3xl font-semibold tracking-tight tabular-nums">{level ? selectedRecords.length : records.length}</span>
                <span className="mt-1 text-xs text-muted-foreground">{level ?? t.records}</span>
              </div>
            </div>
            <div className="min-w-36 flex-1 space-y-1" aria-label={t.selectConfidence}>
              {confidence.map((entry) => (
                <Button key={entry.name} variant={level === entry.name ? "secondary" : "ghost"} aria-pressed={level === entry.name} onClick={() => chooseLevel(entry.name)} className="h-10 w-full justify-start gap-2 px-3">
                  <span className="size-2 rounded-full" style={{ background: entry.fill }} />
                  <span className="text-xs">{entry.name}</span>
                  <span className="ml-auto text-xs tabular-nums">{entry.count}</span>
                  <span className="w-10 text-right text-[11px] font-normal text-muted-foreground tabular-nums">{records.length ? Math.round(entry.count / records.length * 100) : 0}%</span>
                </Button>
              ))}
              <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted-foreground">{t.selectHint}</p>
            </div>
          </div>
          {level && <div className="mt-4 border-t pt-3">
            <div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium" aria-live="polite">{level} · {selectedRecords.length} {t.records}</p><Button variant="ghost" size="xs" onClick={() => setLevel(null)}>{t.reset}</Button></div>
            <div className="max-h-56 overflow-y-auto">
              {selectedRecords.length ? selectedRecords.map((record) => <Button key={record.adres} variant="ghost" onClick={() => onOpenRecord(record)} className="h-auto w-full justify-start gap-3 py-2 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-xs">{record.naam}</span><span className="block text-[11px] font-normal text-muted-foreground">{record.adres}</span></span><ArrowUpRight className="size-3.5" /></Button>) : <p className="text-xs text-muted-foreground">{t.empty}</p>}
            </div>
          </div>}
        </CardContent>
        <p className="border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">{t.demoNote}</p>
      </Card>
      <Card className="min-w-0 gap-0 overflow-hidden border py-0 shadow-xs ring-0">
        <CardHeader className="border-b">
          <CardTitle>{t.streetTitle}</CardTitle>
          <CardDescription className="text-xs">{t.streetNote}</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <Tabs value={scope} onValueChange={setScope}>
            <TabsList aria-label={t.scope} className="mb-4"><TabsTrigger value="all">{t.all}</TabsTrigger><TabsTrigger value="open">{t.open}</TabsTrigger></TabsList>
          </Tabs>
          {visible.length ? <ChartContainer config={config} className="h-48 w-full aspect-auto" aria-label={scope === "open" ? t.open : t.all}>
            <BarChart accessibilityLayer data={streets} layout="vertical" margin={{ left: 0, right: 14, top: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 4" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} domain={[0, Math.max(1, ...streets.map((street) => street.count))]} />
              <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false} />
            </BarChart>
          </ChartContainer> : <div className="flex h-48 items-center justify-center text-sm text-muted-foreground" role="status">{t.noOpen}</div>}
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t.openStreet}>
            {streets.map((street) => <Button variant="outline" size="xs" key={street.name} onClick={() => onOpenStreet(street.name)}>{street.name}<span className="text-muted-foreground tabular-nums">{street.count}</span><ArrowUpRight className="size-3" /></Button>)}
          </div>
        </CardContent>
        <p className="border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">{t.streetFooter}</p>
      </Card>
    </section>
  );
}
