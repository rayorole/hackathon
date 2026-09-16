"use client";
import { BusinessAvatar, StatusPill } from "./data-display";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type MapEntry, recordAddress, coordinateState } from "@/lib/map-data";
import { toRecord } from "@/lib/officer-data";
import { uxNl as u, mapNl as t } from "@/lib/nl";
import { Button } from "./ui/button";
import { useDesk } from "./desk-context";
export function MapRecordDetail({
  entry,
  onClose,
}: {
  entry: MapEntry;
  onClose: () => void;
}) {
  const desk = useDesk(),
    record = entry.record;
  const detail = desk.dossiers.find(
    (d) => d.establishment.id === record.ondernemingsnr,
  );
  const pending =
    detail?.establishment.proposals.filter((p) => p.reviewState === "pending")
      .length ?? 0;
  return (
    <div className="space-y-5 p-5">
      <Button variant="ghost" className="-ml-3" onClick={onClose}>
        <ArrowLeft className="size-4" />
        {t.allResults}
      </Button>
      <div className="space-y-3">
        <BusinessAvatar name={record.naam ?? t.noName} />
        <h2 className="text-lg font-semibold">{record.naam ?? t.noName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {recordAddress(record)}
        </p>
      </div>
      {coordinateState(record) !== "valid" && (
        <p className="text-sm">{t.missing}</p>
      )}
      <StatusPill state={pending ? "pending" : "neutral"}>
        {pending
          ? `${pending} ${pending === 1 ? "wijziging" : "wijzigingen"} te controleren`
          : u.noChange}
      </StatusPill>
      <Button
        disabled={!detail}
        onClick={() => {
          if (detail) desk.openRecord(toRecord(detail), "map");
        }}
      >
        {u.view}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
