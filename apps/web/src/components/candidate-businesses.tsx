"use client";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { candidateRequestSchema, candidateSchema, type Candidate, type CandidateRequest } from "@straatbeeld/contracts/candidates";
import { Plus, ExternalLink, MapPin, Check, X, FileText } from "lucide-react";
import municipality from "../../../../config/municipality.json";
import { api, sourceDate } from "@/lib/officer-data";
import { candidateNl as t } from "@/lib/nl";
import { useDesk } from "./desk-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "./ui/dialog";
import { BusinessAvatar, StatusPill } from "./data-display";
import { LoadingStatus } from "./desk-loading";

export function ReportBusiness() {
  const desk = useDesk();
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const mutation = useMutation({ mutationFn: async (request: CandidateRequest) => candidateSchema.parse(await (await api("/api/candidates", { method: "POST", body: JSON.stringify(request) })).json()) });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "");
    requestId.current ??= crypto.randomUUID();
    const request = candidateRequestSchema.safeParse({ id: requestId.current, name: get("name"), address: { street: get("street"), houseNumber: get("number"), postalCode: get("postal"), municipality: municipality.naam }, source: get("source"), sourceUrl: get("url"), observation: get("observation"), observedAt: get("date") });
    if (!request.success) { setError(t.error); return; }
    try {
      await mutation.mutateAsync(request.data);
      requestId.current = null; setOpen(false); desk.setNotice(t.saved);
      await desk.reloadCandidates().catch(() => undefined);
    } catch (e) { setError(e instanceof Error ? e.message : t.error); }
  }
  return <>
    <Button variant="outline" size="sm" onClick={() => desk.guard(() => setOpen(true))}><Plus className="size-4" />{t.report}</Button>
    <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!mutation.isPending}>
        <DialogHeader><DialogTitle>{t.title}</DialogTitle><DialogDescription>{t.intro}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="candidate-name">{t.name}</Label><Input id="candidate-name" name="name" required maxLength={200} /></div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-2"><Label htmlFor="candidate-street">{t.street}</Label><Input id="candidate-street" name="street" required maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="candidate-number">{t.number}</Label><Input id="candidate-number" name="number" required maxLength={30} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="candidate-postal">{t.postal}</Label><Input id="candidate-postal" name="postal" defaultValue={municipality.postcodes[0]} required pattern="[0-9]{4}" /></div>
            <div className="space-y-2"><Label htmlFor="candidate-municipality">{t.municipality}</Label><Input id="candidate-municipality" value={municipality.naam} readOnly /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="candidate-source">{t.publisher}</Label><Input id="candidate-source" name="source" required maxLength={200} /></div>
          <div className="space-y-2"><Label htmlFor="candidate-url">{t.url}</Label><Input id="candidate-url" name="url" type="url" required maxLength={2000} /></div>
          <div className="space-y-2"><Label htmlFor="candidate-observation">{t.observation}</Label><Textarea id="candidate-observation" name="observation" required maxLength={2000} /></div>
          <div className="space-y-2"><Label htmlFor="candidate-date">{t.date}</Label><Input id="candidate-date" name="date" type="date" required max={new Date().toISOString().slice(0,10)} /></div>
          <p className="text-xs text-muted-foreground">{t.duplicateNote}</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setOpen(false)}>{t.cancel}</Button><Button disabled={mutation.isPending}>{mutation.isPending ? <LoadingStatus label={t.saving} /> : t.submit}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function CandidateList({ mode }: { mode: "pending" | "approved" | "history" }) {
  const desk = useDesk();
  const [reloadError, setReloadError] = useState("");
  if (desk.candidatesLoading) return <LoadingStatus label={t.loading} />;
  if (desk.candidatesError || reloadError) return <div role="alert" className="rounded-lg border p-4 text-sm"><p>{desk.candidatesError || reloadError}</p><Button variant="outline" className="mt-2" onClick={() => { setReloadError(""); void desk.reloadCandidates().catch(e => setReloadError(e.message)); }}>{t.retry}</Button></div>;
  const candidates = desk.candidates.filter(c => {
    if (mode === "pending") return c.status === "pending";
    if (mode === "history") return c.status !== "pending";
    return desk.matchingCandidates.includes(c);
  });
  if (!candidates.length) return null;
  return <section className="space-y-3"><h2 className="text-sm font-semibold">{mode === "pending" ? t.pending : mode === "approved" ? t.accepted : t.history} <span className="text-muted-foreground">({candidates.length})</span></h2>{candidates.map(c => <CandidateCard candidate={c} key={c.id} />)}</section>;
}
function CandidateCard({ candidate }: { candidate: Candidate }) {
  const desk = useDesk();
  const [note, setNote] = useState("");
  const mutation = useMutation({ mutationFn: async (decision: "approve" | "reject") => candidateSchema.parse(await (await api(`/api/candidates/${candidate.id}/review`, { method: "POST", body: JSON.stringify({ decision, expectedRevision: candidate.revision, note }) })).json()), onSuccess: async () => { desk.setNotice(t.decision); await desk.reloadCandidates().catch(() => undefined); } });
  const item = mutation.data ?? candidate;
  return <article className="candidate-card surface-panel">
    <header className="flex flex-wrap items-center gap-3"><BusinessAvatar name={item.name} seed={item.id} /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{item.address.street} {item.address.houseNumber} · {item.address.postalCode} {item.address.municipality}</p></div><StatusPill state={item.status}>{item.status === "pending" ? t.candidate : item.status === "approved" ? t.approved : t.rejected}</StatusPill></header>
    <div className="candidate-evidence"><p className="flex items-center gap-2 text-xs font-medium"><FileText className="size-3.5" />{item.source}<a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${t.source}: ${item.source}`} className="text-primary"><ExternalLink className="size-3.5" /></a></p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.observation}</p><p className="mt-2 text-xs text-muted-foreground">{t.observed} {sourceDate(item.observedAt)} · {t.reported} {sourceDate(item.createdAt)}</p></div>
    {item.status === "pending" ? <div className="space-y-3"><Label htmlFor={`candidate-note-${item.id}`}>{t.note}</Label><Textarea id={`candidate-note-${item.id}`} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} /><p className="text-xs text-muted-foreground">{t.confirmNote}</p><div className="flex flex-wrap gap-2"><Button disabled={mutation.isPending} onClick={() => mutation.mutate("approve")}><Check className="size-4" />{t.approve}</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("reject")}><X className="size-4" />{t.reject}</Button></div>{mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}</div> : <div className="space-y-1 text-xs text-muted-foreground"><p>{item.status === "approved" ? t.approvedNote : t.rejected}</p>{item.review && <p>{t.updated} {sourceDate(item.review.reviewedAt)} · {item.review.reviewerId === desk.officerId ? desk.officer : item.review.reviewerId}</p>}{item.review?.note && <p>{item.review.note}</p>}</div>}
  </article>;
}
