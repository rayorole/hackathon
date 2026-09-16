import { detailSchema, type Detail } from "@straatbeeld/contracts";
const fieldNl: Record<string, string> = {
  telephone: "Telefoon",
  phone: "Telefoon",
  email: "E-mail",
  website: "Website",
  name: "Naam",
  address: "Adres",
  opening_hours: "Openingsuren",
  openingHours: "Openingsuren",
  localService: "Lokale dienstverlening",
};
export const fieldLabel = (field: string) => fieldNl[field] ?? field;
export const sourceDate = (date: string) =>
  new Date(date).toLocaleDateString("nl-BE", { timeZone: "Europe/Brussels" });
export type RecordView = ReturnType<typeof toRecord>;
export function toRecord(detail: Detail, proposalId?: string) {
  const e = detail.establishment,
    p =
      e.proposals.find((p) => p.id === proposalId) ??
      e.proposals.find((p) => p.reviewState === "pending" && !p.supersededBy) ??
      e.proposals.at(-1);

  const evidenceViews = detail.evidence.map((v) => {
    const s = detail.sources.find((s) => s.id === v.sourceId);
    return {
      id: v.id,
      waarneming: v.excerpt,
      bron: `${s?.publisher ?? "Onbekende bron"} · ${v.scope === "local" ? "vestiging" : v.scope === "enterprise" ? "onderneming" : "reikwijdte onbekend"}`,
      datum: s ? sourceDate(s.retrievedAt) : "Onbekend",
      url: s?.url ?? "",
    };
  });

  return {
    id: e.id,
    detail,
    proposal: p,
    adres: e.address.street + " " + e.address.houseNumber,
    street: e.address.street,
    naam: e.name,
    soort: "Vestigingseenheid",
    register: e.registryStatus ?? "Niet vastgesteld",
    laatste: detail.sources.length
      ? sourceDate(detail.sources.at(-1)!.retrievedAt)
      : "Onbekend",
    zekerheid: (e.activityAssessment === "supported"
      ? "Hoog"
      : e.activityAssessment === "insufficient"
        ? "Laag"
        : "Middel") as "Hoog" | "Middel" | "Laag",
    voorstel: p
      ? `${p.reviewState === "pending" ? "" : p.reviewState === "approved" ? "Bevestigd · " : "Afgewezen · "}${fieldLabel(p.field)}: ${p.proposedValue ?? "—"}`
      : "Geen open voorstel",
    voorstelLang: p
      ? `${p.reasonNl} Huidig: ${p.before ?? "onbekend"}. Voorstel: ${p.proposedValue ?? "—"}.`
      : "Geen open voorstel. Ontbrekend bewijs betekent niet dat de vestiging inactief is.",
    vestNr: e.id,
    ondNr: e.parentEnterpriseId ?? "Onbekend",
    zetel: e.parent?.registeredAddress
      ? `${e.parent.registeredAddress.street} ${e.parent.registeredAddress.houseNumber}, ${e.parent.registeredAddress.municipality}`
      : "Niet vastgesteld",
    rechtstoestand: e.parent?.registryStatus ?? "Niet vastgesteld",
    contact:
      [
        ...new Set(
          detail.evidence
            .filter((x) => /phone|email|telephone/i.test(x.field))
            .map((x) => x.observedValue)
            .filter(Boolean),
        ),
      ].join(" · ") || "Niet vastgesteld",
    contactNiveau: "Bekijk de reikwijdte per bewijsbron",
    contactBron: "Brongegevens zijn geen goedgekeurde wijziging",
    bewijs: evidenceViews,
    proposalEvidence: evidenceViews.filter((v) =>
      p?.evidenceIds.includes(v.id),
    ),
  };
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? "Aanvraag mislukt.", r.status);
  }
  return r;
}
export async function loadWorkspace() {
  const data = await (await api("/api/workspace")).json();
  return (data.details as unknown[]).map((d) => detailSchema.parse(d));
}
