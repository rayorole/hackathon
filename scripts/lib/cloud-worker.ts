import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { detailSchema } from "../../packages/contracts/src/index";
import { research, targets } from "./research";
import { publicHtml,parseDirectory,matchDirectory } from "./discovery";
import { cloudBudget } from "./cloud-budget";
export async function runMunicipalPass(db:SupabaseClient){
const started=Date.now();
const municipality = "Schoten",
  worker = randomUUID();
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await db.rpc(name, args);
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
async function discover() {
  const entries = parseDirectory(
    await publicHtml("https://www.genietvanschoten.be/handelaars"),
  );
  if (!entries.length) throw new Error("Directory has no recognizable entries");
  const result = await db
    .from("straatbeeld_cases")
    .select("detail")
    .eq("municipality", municipality)
    .eq("detail->establishment->>isDemo", "false");
  if (result.error) throw result.error;
  const existing = await db
    .from("straatbeeld_research_queue")
    .select("establishment_id,sources,priority,status")
    .eq("municipality", municipality);
  if (existing.error) throw existing.error;
  const previous = new Map(existing.data.map((x) => [x.establishment_id, x]));
  let matched = 0;
  let linked = 0;
  for (const row of result.data) {
    if (
      linked++ % 50 === 0 &&
      !(await rpc("straatbeeld_plan", {
        p_municipality: municipality,
        p_worker: worker,
      }))
    )
      throw new Error("Worker lease lost");
    const d = detailSchema.parse(row.detail),
      found = matchDirectory(d, entries);
    const sources = [
      ...new Map(
        [...found, ...(targets[d.establishment.id] ?? [])].map((x) => [
          x.url,
          x,
        ]),
      ).values(),
    ];
    if (sources.length) matched++;
    const old = previous.get(d.establishment.id);
    if (old && JSON.stringify(old.sources) === JSON.stringify(sources))
      continue;
    const update = await db
      .from("straatbeeld_research_queue")
      .update({
        sources,
        priority: Math.max(old?.priority ?? 0, sources.length ? 10 : 0),
        ...(sources.length && old?.status === "no_source"
          ? { status: "queued", next_due_at: new Date().toISOString() }
          : {}),
      })
      .eq("establishment_id", d.establishment.id)
      .neq("status", "running");
    if (update.error) throw update.error;
  }
  const update = await db
    .from("straatbeeld_monitoring")
    .update({
      directory_checked_at: new Date().toISOString(),
      directory_candidates: entries.length,
    })
    .eq("municipality", municipality);
  if (update.error) throw update.error;
  console.log(
    `Directory: ${entries.length} public listings; ${matched} matched known establishments. Unmatched listings are not automatically added.`,
  );

}
async function tick() {
  if (
    !(await rpc("straatbeeld_plan", {
      p_municipality: municipality,
      p_worker: worker,
    }))
  )
    throw new Error("Another worker owns the municipal lease");
  const monitoring=await db.from("straatbeeld_monitoring").select("directory_checked_at").eq("municipality",municipality).single();
  if(monitoring.error)throw monitoring.error;
  if(!monitoring.data.directory_checked_at||Date.now()-Date.parse(monitoring.data.directory_checked_at)>86400000)await discover();
  for (let i = 0; i < 10 && Date.now()-started<65000; i++) {
    await rpc("straatbeeld_plan", {
      p_municipality: municipality,
      p_worker: worker,
    });
    const [job] = await rpc("straatbeeld_claim", {
      p_municipality: municipality,
      p_worker: worker,
    });
    if (!job) break;
    let outcome = "failed",
      message = "Onderzoek mislukt; bestaande gegevens behouden.",
      days = 1,
      detail = null,
      version = 0;
    try {
      const read = await db
        .from("straatbeeld_cases")
        .select("detail,version")
        .eq("id", job.establishment_id)
        .single();
      if (read.error) throw read.error;
      version = read.data.version;
      if (!job.sources.length) {
        outcome = "no_source";
        days = 30;
        message =
          "Geen eenduidige bron gevonden in de aangesloten handelaarsgids. Dit zegt niets over sluiting.";
      } else {
        const result = await research(
          detailSchema.parse(read.data.detail),
          job.sources,
          async () => {
            const c = await db
              .from("straatbeeld_monitoring")
              .select(
                "research_started,max_research,worker_id,lease_until,paused",
              )
              .eq("municipality", municipality)
              .single();
            if (c.error) throw c.error;
            if (
              c.data.worker_id !== worker ||
              Date.parse(c.data.lease_until) < Date.now() ||
              c.data.paused
            )
              throw new Error("Worker lease lost or paused");
            if (c.data.research_started >= c.data.max_research)
              throw new Error("Research tranche budget reached");
            const reserved = await db
              .from("straatbeeld_monitoring")
              .update({ research_started: c.data.research_started + 1 })
              .eq("municipality", municipality)
              .eq("worker_id", worker)
              .eq("research_started", c.data.research_started)
              .select("municipality");
            if (reserved.error || !reserved.data?.length)
              throw new Error("Research reservation conflict");
          },
          cloudBudget(db),
        );
        detail = result.refreshed ? result.detail : null;
        outcome = "checked";
        days = 7;
        message = result.messageNl;
      }
    } catch (error) {
      if (error instanceof Error && /budget/i.test(error.message)) {
        outcome = "budget_blocked";
        message =
          "Nieuw brononderzoek wacht op beschikbaar onderzoeksbudget. Bestaande gegevens blijven behouden.";
      }
      console.error(
        `Research failed: ${job.establishment_id}`,
        error instanceof Error ? error.message : "unknown",
      );
    }
    const saved = await rpc("straatbeeld_finish", {
      p_id: job.establishment_id,
      p_claim: job.claim_id,
      p_version: version,
      p_detail: detail,
      p_outcome: outcome,
      p_message: message,
      p_days: days,
    });
    if (!saved)
      throw new Error("Research lease expired; result was not persisted");
    console.log(`${job.establishment_id}: ${outcome}`);
  }
}

try { await tick(); return {ok:true}; }
finally {await db.from("straatbeeld_monitoring").update({lease_until:new Date().toISOString(),worker_id:null}).eq("municipality",municipality).eq("worker_id",worker);}
}
