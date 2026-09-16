"use client";
import { useState, type ReactNode } from "react";
import type { Detail } from "@straatbeeld/contracts";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  ApiError,
  api,
  fieldLabel,
  sourceDate,
  toRecord,
} from "@/lib/officer-data";
import {
  approvedChanges,
  evidenceGroups,
  normalizedField,
  proposalPresentation,
} from "@/lib/review-presentation";
import { uxNl as u } from "@/lib/nl";
import { useDesk } from "./desk-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="border-t py-4">
      <summary className="cursor-pointer text-sm font-medium marker:text-muted-foreground">
        {title}
      </summary>
      <div className="mt-4 space-y-4 text-sm">{children}</div>
    </details>
  );
}
export function Evidence({
  items,
}: {
  items: ReturnType<typeof evidenceGroups>;
}) {
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div
          key={item.evidenceIds.join(",")}
          className="border-l-2 border-border pl-4"
        >
          <p className="mb-2 text-sm font-medium">
            {item.source?.publisher ?? u.unknown}
          </p>
          <blockquote className="text-sm leading-relaxed whitespace-pre-wrap">
            {item.excerpt}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {item.scope === "local"
                ? u.local
                : item.scope === "enterprise"
                  ? u.enterprise
                  : u.unknownScope}
            </span>
            <span>
              {u.fetched}{" "}
              {item.source ? sourceDate(item.source.retrievedAt) : u.unknown}
            </span>
            {item.source?.observedAt && (
              <span>
                {u.observed} {sourceDate(item.source.observedAt)}
              </span>
            )}
            {item.source?.cached && <span>{u.cached}</span>}
          </div>
          {item.source && (
            <a
              className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4"
              href={item.source.url}
              target="_blank"
              rel="noreferrer"
            >
              {u.source}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
export function BusinessDetail({ detail }: { detail: Detail }) {
  const desk = useDesk();
  const e = detail.establishment;
  const proposal =
    e.proposals.find((p) => p.id === desk.params.get("voorstel")) ??
    e.proposals.find((p) => p.reviewState === "pending") ??
    e.proposals.at(-1);
  const approved = approvedChanges([detail]);
  const contact = approved.filter((item) =>
    ["telephone", "email", "website"].includes(
      normalizedField(item.proposal.field),
    ),
  );
  const sourceContacts = evidenceGroups(detail).filter((item) =>
    ["telephone", "email", "website"].includes(normalizedField(item.field)),
  );
  return (
    <div className="mx-auto w-full max-w-3xl space-y-7">
      <Button variant="ghost" className="-ml-3" onClick={desk.back}>
        <ArrowLeft className="size-4" />
        {desk.screen === "review" ? u.backReview : u.back}
      </Button>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {e.address.street} {e.address.houseNumber} · {e.address.postalCode}{" "}
          {e.address.municipality}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {u.activity[e.activityAssessment]}
        </p>
      </header>
      {proposal ? (
        <>
          {e.proposals.length > 1 && (
            <div>
              <Label htmlFor="proposal-choice">{u.pending}</Label>
              <select
                id="proposal-choice"
                className="mt-2 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={proposal.id}
                onChange={(event) =>
                  desk.openRecord(
                    toRecord(detail, event.target.value),
                    desk.screen,
                  )
                }
              >
                {e.proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fieldLabel(p.field)} ·{" "}
                    {p.reviewState === "pending"
                      ? u.pendingStatus
                      : p.reviewState === "approved"
                        ? u.approved
                        : u.rejected}
                  </option>
                ))}
              </select>
            </div>
          )}
          <ProposalReview
            key={proposal.id}
            detail={detail}
            proposalId={proposal.id}
          />
        </>
      ) : (
        <div className="rounded-lg bg-muted/50 p-5">
          <p className="font-medium">{u.noChange}</p>
          <p className="mt-2 text-sm text-muted-foreground">{u.noChangeNote}</p>
        </div>
      )}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{u.contact}</h2>
        {contact.length ? (
          contact.map(({ proposal: p, review }) => (
            <p key={p.id} className="text-sm">
              <span className="font-medium">{fieldLabel(p.field)}:</span>{" "}
              {review.effectiveValue ?? u.unknown}{" "}
              <span className="text-muted-foreground">· {u.approved}</span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{u.noContact}</p>
        )}
      </section>
      <div>
        <Disclosure title={u.registry}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Vestigingsnummer", e.id],
              ["Ondernemingsnummer", e.parentEnterpriseId],
              ["Onderneming", e.parent?.legalName],
              [
                "Maatschappelijke zetel",
                e.parent?.registeredAddress
                  ? `${e.parent.registeredAddress.street} ${e.parent.registeredAddress.houseNumber}, ${e.parent.registeredAddress.municipality}`
                  : null,
              ],
              ["Rechtstoestand onderneming", e.parent?.registryStatus],
              ["Registerstatus vestiging", e.registryStatus],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words">{value ?? u.unknown}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground">
            Een registratie of een goedgekeurd contactgegeven bewijst niet dat
            een zaak vandaag actief is.
          </p>
        </Disclosure>
        {sourceContacts.length > 0 && (
          <Disclosure title={u.foundContact}>
            <p className="text-muted-foreground">
              {u.sourceOnly}. Afgewezen voorstellen zijn geen goedgekeurde
              contactgegevens.
            </p>
            <Evidence items={sourceContacts} />
          </Disclosure>
        )}
        <Disclosure title={`${u.allSources} (${detail.sources.length})`}>
          <Evidence items={evidenceGroups(detail)} />
          {detail.sources
            .filter(
              (s) => !detail.evidence.some((item) => item.sourceId === s.id),
            )
            .map((s) => (
              <p key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {s.publisher}
                </a>{" "}
                · {u.fetched} {sourceDate(s.retrievedAt)}
              </p>
            ))}
          <Button
            variant="outline"
            disabled={desk.busy}
            onClick={() => desk.guard(() => void desk.refresh(e.id))}
          >
            {desk.busy ? u.refreshing : u.refresh}
          </Button>
        </Disclosure>
        <Disclosure title={`${u.audit} (${detail.reviews.length})`}>
          {detail.reviews.length ? (
            [...detail.reviews].reverse().map((r) => (
              <div key={r.reviewId} className="border-b pb-4">
                <p className="font-medium">
                  {fieldLabel(
                    e.proposals.find((p) => p.id === r.proposalId)?.field ?? "",
                  )}{" "}
                  · {r.decision === "approve" ? u.approved : u.rejected}
                </p>
                <p>
                  {r.effectiveValue ?? "—"} ·{" "}
                  {new Date(r.reviewedAt).toLocaleString("nl-BE")}
                </p>
                <p>{r.note}</p>
                <p className="mt-1 text-muted-foreground">
                  {u.employee}:{" "}
                  {r.reviewerId === desk.officerId
                    ? desk.officer
                    : (r.reviewerId ?? u.unknown)}{" "}
                  · {u.revision} {r.revision}
                </p>
              </div>
            ))
          ) : (
            <p>{u.historyEmpty}</p>
          )}
        </Disclosure>
      </div>
    </div>
  );
}
function ProposalReview({
  detail,
  proposalId,
}: {
  detail: Detail;
  proposalId: string;
}) {
  const desk = useDesk(),
    model = proposalPresentation(detail, proposalId)!;
  const { proposal: p, evidence, latest } = model;
  const [failure, setFailure] = useState(""),
    [revising, setRevising] = useState(false),
    [completed, setCompleted] = useState<"approve" | "reject" | null>(null),
    [stale, setStale] = useState(false);
  const draft = desk.drafts[p.id];
  const reviewed = p.reviewState !== "pending" && !revising;
  const next = desk.queue.find((r) => r.proposal?.id !== p.id);
  function edit(mode: "edit" | "reject") {
    desk.setDraft(p.id, {
      mode,
      value: draft?.value ?? p.proposedValue ?? "",
      note: draft?.note ?? "",
      revision: p.revision,
    });
  }
  async function decide(decision: "approve" | "reject") {
    if (desk.busy || stale) return;
    desk.setBusy(true);
    setFailure("");
    try {
      await api("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          proposalId: p.id,
          expectedRevision: draft?.revision ?? p.revision,
          decision,
          ...(decision === "approve" && draft?.mode === "edit"
            ? { correctedValue: draft.value }
            : {}),
          note: draft?.note ?? "",
        }),
      });
      desk.setDraft(p.id, null);
      setCompleted(decision);
      setRevising(false);
      desk.setNotice(
        decision === "approve"
          ? `${fieldLabel(p.field)}: ${u.saved}`
          : u.rejectedSaved,
      );
      try {
        await desk.reload();
      } catch {
        setFailure(
          "Uw beslissing is opgeslagen, maar de bijgewerkte gegevens konden niet laden. Probeer opnieuw te laden.",
        );
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setStale(true);
        setFailure(u.stale);
        try {
          await desk.reload();
        } catch {
          /* retain draft and original conflict */
        }
      } else setFailure(error instanceof Error ? error.message : u.retry);
    } finally {
      desk.setBusy(false);
    }
  }
  return (
    <section className="space-y-5" aria-labelledby="review-heading">
      <h2 id="review-heading" className="text-lg font-semibold">
        {fieldLabel(p.field)} {reviewed ? "" : u.check.toLowerCase()}
      </h2>
      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {latest ? u.original : u.before}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base">
            {p.before ?? u.unknown}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{u.proposed}</p>
          <p className="mt-2 whitespace-pre-wrap text-base">
            {p.proposedValue ?? u.unknown}
          </p>
        </div>
      </div>
      {latest && (
        <p className="text-sm">
          {latest.decision === "approve" ? u.approved : u.rejected}:{" "}
          {latest.effectiveValue ?? "—"} ·{" "}
          {new Date(latest.reviewedAt).toLocaleString("nl-BE")}
        </p>
      )}
      <div>
        <h3 className="text-sm font-semibold">{u.reason}</h3>
        <p className="mt-2 text-sm leading-relaxed">{p.reasonNl}</p>
      </div>
      {(model.hasConflict || model.compareSources || model.needsLocalCheck) && (
        <div className="flex gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">
              {model.hasConflict
                ? u.conflict
                : model.needsLocalCheck
                  ? u.localCheck
                  : u.compare}
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {model.hasConflict
                ? u.conflictNote
                : model.needsLocalCheck
                  ? u.localCheckNote
                  : u.compareNote}
            </p>
          </div>
        </div>
      )}
      {detail.establishment.parent?.registeredAddress &&
        detail.establishment.parent.registeredAddress.municipality !==
          detail.establishment.address.municipality && (
          <p className="text-sm text-muted-foreground">
            Dit gaat over de winkel in{" "}
            {detail.establishment.address.municipality}; het hoofdkantoor ligt
            in {detail.establishment.parent.registeredAddress.municipality}.
          </p>
        )}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{u.evidence}</h3>
        {evidence.length ? (
          <Evidence items={evidence} />
        ) : (
          <p>{u.noEvidence}</p>
        )}
      </div>
      {failure && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-4 text-sm"
        >
          <p>{failure}</p>
          {stale ? (
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                setStale(false);
                setFailure("");
                setRevising(true);
                if (draft)
                  desk.setDraft(p.id, { ...draft, revision: p.revision });
              }}
            >
              {u.acknowledge}
            </Button>
          ) : (
            completed && (
              <Button
                variant="outline"
                onClick={() => desk.reload().catch(() => setFailure(u.retry))}
              >
                {u.retry}
              </Button>
            )
          )}
        </div>
      )}
      <div className="space-y-4 border-t pt-5">
        {reviewed || completed ? (
          <>
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              {completed === "reject" ||
              (!completed && p.reviewState === "rejected")
                ? u.rejected
                : u.approved}
            </p>
            <div className="flex flex-wrap gap-2">
              {next && (
                <Button onClick={() => desk.openRecord(next, "review")}>
                  {u.next}
                  <ArrowRight className="size-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setRevising(true);
                  setCompleted(null);
                }}
              >
                {u.revise}
              </Button>
              <Button variant="ghost" onClick={desk.back}>
                {desk.screen === "review" ? u.backReview : u.back}
              </Button>
            </div>
          </>
        ) : (
          <>
            {draft && (
              <div className="space-y-4 rounded-lg bg-muted/40 p-4">
                {draft.mode === "edit" && (
                  <div>
                    <Label htmlFor="review-value">{u.adjusted}</Label>
                    <Input
                      id="review-value"
                      className="mt-2"
                      value={draft.value}
                      maxLength={2000}
                      onChange={(event) =>
                        desk.setDraft(p.id, {
                          ...draft,
                          value: event.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="review-note">{u.note}</Label>
                  <Textarea
                    id="review-note"
                    className="mt-2"
                    value={draft.note}
                    maxLength={2000}
                    onChange={(event) =>
                      desk.setDraft(p.id, {
                        ...draft,
                        note: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {draft ? (
                <>
                  <Button
                    disabled={desk.busy || stale}
                    onClick={() =>
                      void decide(
                        draft.mode === "reject" ? "reject" : "approve",
                      )
                    }
                  >
                    {desk.busy
                      ? u.saving
                      : draft.mode === "reject"
                        ? u.saveReject
                        : u.save}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={desk.busy}
                    onClick={() => desk.setDraft(p.id, null)}
                  >
                    {u.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={desk.busy || stale || !evidence.length}
                    onClick={() => void decide("approve")}
                  >
                    {desk.busy ? u.saving : u.approve}
                  </Button>
                  <Button
                    disabled={desk.busy}
                    variant="outline"
                    onClick={() => edit("edit")}
                  >
                    {u.edit}
                  </Button>
                  <Button
                    disabled={desk.busy}
                    variant="ghost"
                    onClick={() => edit("reject")}
                  >
                    {u.reject}
                  </Button>
                </>
              )}
              <Button disabled={desk.busy} variant="ghost" onClick={desk.back}>
                {u.later}
              </Button>
            </div>
          </>
        )}
        <p className="text-sm text-muted-foreground">{u.officialNote}</p>
      </div>
    </section>
  );
}
