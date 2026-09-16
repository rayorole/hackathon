"use client";

import type { Detail } from "@straatbeeld/contracts";
import { Clock3, FileText, History, Check, Minus } from "lucide-react";
import { detailNl as t, uxNl as u } from "@/lib/nl";
import { fieldLabel } from "@/lib/officer-data";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

export function BusinessOverview({ detail }: { detail: Detail }) {
  const proposals = detail.establishment.proposals;
  const counts = [
    { state: "pending", label: u.pendingStatus, count: proposals.filter(p => p.reviewState === "pending").length },
    { state: "approved", label: u.approved, count: proposals.filter(p => p.reviewState === "approved").length },
    { state: "rejected", label: u.rejected, count: proposals.filter(p => p.reviewState === "rejected").length },
  ];
  return <div className="detail-overview">
    <div className="detail-overview-stat"><Clock3 aria-hidden /><div><strong>{counts[0].count}</strong><span>{t.toReview}</span></div></div>
    <div className="detail-overview-stat"><FileText aria-hidden /><div><strong>{detail.sources.length}</strong><span>{t.linkedSources}</span></div></div>
    <div className="detail-progress">
      <div className="detail-progress-heading"><span>{t.proposalStatus}</span><strong>{proposals.length - counts[0].count} / {proposals.length} {t.reviewed}</strong></div>
      <div className="detail-status-chart" role="img" aria-label={counts.map(c => `${c.count} ${c.label}`).join(", ")}>
        {counts.filter(c => c.count > 0).map(c => <span key={c.state} className={`detail-status-${c.state}`} style={{ flex: c.count }} />)}
      </div>
      <div className="detail-chart-legend">{counts.map(c => <span key={c.state}><i className={`detail-status-dot detail-status-${c.state}`} />{c.count} {c.label}</span>)}</div>
    </div>
  </div>;
}

export function DecisionTimeline({ detail }: { detail: Detail }) {
  const reviews = [...detail.reviews].sort((a,b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0,3);
  return <Card className="detail-timeline rounded-xl gap-4 p-5 shadow-none border ring-0">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" aria-hidden />{t.recentDecisions}<Badge variant="secondary" className="ml-auto">{detail.reviews.length}</Badge></h2>
    {reviews.length ? <ol>{reviews.map(r => <li key={r.reviewId}>
      <span className={`detail-timeline-icon detail-status-${r.decision === "approve" ? "approved" : "rejected"}`}>{r.decision === "approve" ? <Check aria-hidden /> : <Minus aria-hidden />}</span>
      <div><p className="font-medium">{fieldLabel(detail.establishment.proposals.find(p => p.id === r.proposalId)?.field ?? "")} <span className="font-normal text-muted-foreground">· {r.decision === "approve" ? u.approved : u.rejected}</span></p><time dateTime={r.reviewedAt}>{new Date(r.reviewedAt).toLocaleString("nl-BE")}</time>{r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}</div>
    </li>)}</ol> : <p className="text-sm text-muted-foreground">{u.historyEmpty}</p>}
  </Card>;
}
