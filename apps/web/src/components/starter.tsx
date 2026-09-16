"use client";
import { useState } from "react";
import type { Detail, Establishment } from "@straatbeeld/contracts";
import { dataClient, resetDemo } from "@/lib/data-client";
const activityLabels = {
  supported: "Aanwijzingen voor activiteit",
  conflicting: "Tegenstrijdig bewijs",
  insufficient: "Onvoldoende bewijs",
  needs_check: "Te controleren",
};
const reviewLabels = {
  pending: "Nog te beoordelen",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
};
export function Starter() {
  const [items, setItems] = useState<Establishment[]>([]),
    [selected, setSelected] = useState<Detail | null>(null),
    [message, setMessage] = useState("Klaar om te starten."),
    [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <p className="eyebrow">STRAATBEELD / GEDEELDE START</p>
        <h1>Van bron naar beoordeling.</h1>
        <p>
          Werkende aansluitpunten voor het team. Ray bouwt hier de
          officer-interface; Jochem sluit de echte bronnen aan.
        </p>
      </header>
      <section className="notice">
        <strong>
          {process.env.NEXT_PUBLIC_DATA_MODE === "api"
            ? "API-modus"
            : "Oefenmodus — fictieve bedrijven"}
        </strong>
        <p>
          {process.env.NEXT_PUBLIC_DATA_MODE === "api"
            ? "Beoordelingen worden via de API opgeslagen. De startvoorbeelden zijn fictief."
            : "Oefenbeoordelingen blijven alleen in deze browser bewaard."}
          Bronverversing en productie-authenticatie zijn nog niet aangesloten.
        </p>
      </section>
      <div className="actions">
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await dataClient.list({
                municipality: "Schoten",
                street: "Paalstraat",
              });
              setItems(r.items);
              setMessage(r.coverage.labelNl);
            })
          }
        >
          Laad Paalstraat
        </button>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const csv = await dataClient.exportCsv({
                municipality: "Schoten",
                street: "Paalstraat",
              });
              const url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv;charset=utf-8" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "straatbeeld-reviewed.csv";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage("Beoordeelde wijzigingen geëxporteerd.");
            })
          }
        >
          Exporteer goedgekeurd
        </button>
        {process.env.NEXT_PUBLIC_DATA_MODE !== "api" && (
          <button
            disabled={busy}
            onClick={() => {
              resetDemo();
              setSelected(null);
              setItems([]);
              setMessage("Oefenvoorbeelden hersteld.");
            }}
          >
            Herstel oefendata
          </button>
        )}
      </div>
      <p role="status">{busy ? "Bezig…" : message}</p>
      <div className="grid">
        <section>
          <h2>Vestigingen</h2>
          {items.length === 0 ? (
            <p>Laad de voorbeelden om de koppeling te controleren.</p>
          ) : (
            items.map((e) => (
              <button
                className="record"
                disabled={busy}
                key={e.id}
                onClick={() =>
                  run(async () => {
                    setSelected(await dataClient.detail(e.id));
                    setMessage("Bewijs geladen.");
                  })
                }
              >
                <strong>{e.name}</strong>
                <span>
                  {e.address.street} {e.address.houseNumber}
                </span>
                <small>{activityLabels[e.activityAssessment]}</small>
              </button>
            ))
          )}
        </section>
        <section>
          <h2>Bewijs en voorstel</h2>
          {!selected ? (
            <p>Selecteer een vestiging.</p>
          ) : (
            <>
              <h3>{selected.establishment.name}</h3>
              <p>
                Onderneming:{" "}
                {selected.establishment.parent?.legalName ??
                  "Niet aanwezig in deze gegevens"}
              </p>
              {selected.evidence.map((e) => (
                <blockquote key={e.id}>{e.excerpt}</blockquote>
              ))}
              {selected.sources.map((s) => (
                <p key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.publisher}
                  </a>{" "}
                  · opgehaald {s.retrievedAt} {s.isDemo ? "(fictief)" : ""}
                </p>
              ))}
              {selected.establishment.proposals.map((p) => (
                <article key={p.id}>
                  <p>{p.reasonNl}</p>
                  <p>
                    Voorstel: {p.proposedValue} · {reviewLabels[p.reviewState]}
                  </p>
                  <div className="actions">
                    {(["approve", "reject"] as const).map((decision) => (
                      <button
                        disabled={busy}
                        key={decision}
                        onClick={() =>
                          run(async () => {
                            await dataClient.review({
                              proposalId: p.id,
                              expectedRevision: p.revision,
                              decision,
                            });
                            setSelected(
                              await dataClient.detail(
                                selected.establishment.id,
                              ),
                            );
                            setMessage("Beoordeling opgeslagen.");
                          })
                        }
                      >
                        {decision === "approve" ? "Bevestigen" : "Afwijzen"}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await dataClient.refresh(
                      selected.establishment.id,
                    );
                    setSelected(r.detail);
                    setMessage(r.messageNl);
                  })
                }
              >
                Controleer verversing
              </button>
              <p>{selected.reviews.length} beoordelingen in historie</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
