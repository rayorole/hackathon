import { accessGuard, failure } from "@/server/http";
import { supabaseAdmin } from "@/server/supabase";
import { monitoringSchema, DataError } from "@straatbeeld/contracts";
export async function GET(r: Request) {
  try {
    await accessGuard(r);
    const db = supabaseAdmin();
    const [config, queue] = await Promise.all([
      db
        .from("straatbeeld_monitoring")
        .select("*")
        .eq("municipality", "Schoten")
        .maybeSingle(),
      db
        .from("straatbeeld_research_queue")
        .select(
          "establishment_id,status,last_attempt_at,last_success_at,next_due_at,message_nl,straatbeeld_cases(name:detail->establishment->>name)",
        )
        .eq("municipality", "Schoten")
        .limit(1000),
    ]);
    if (config.error || queue.error) throw new Error("Monitoring unavailable");
    const c = config.data,
      rows = queue.data ?? [];
    const count = (status: string) =>
      rows.filter((x) => x.status === status).length;
    return Response.json(
      monitoringSchema.parse({
        municipality: "Schoten",
        paused: c?.paused ?? true,
        online:
          !!c?.heartbeat_at && Date.now() - Date.parse(c.heartbeat_at) < 180000,
        heartbeatAt: c?.heartbeat_at ?? null,
        lastPlannedAt: c?.last_planned_at ?? null,
        directoryCheckedAt: c?.directory_checked_at ?? null,
        directoryCandidates: c?.directory_candidates ?? 0,
        researchStarted: c?.research_started ?? 0,
        researchLimit: c?.max_research ?? 0,
        total: rows.length,
        queued: count("queued"),
        running: count("running"),
        checked: rows.filter((x) => x.last_success_at).length,
        noSource: count("no_source"),
        failed: count("failed"),
        blocked: count("budget_blocked"),
        nextDueAt: rows.map((x) => x.next_due_at).sort()[0] ?? null,
        jobs: rows
          .sort((a, b) =>
            (b.last_attempt_at ?? "").localeCompare(a.last_attempt_at ?? ""),
          )
          .map((x) => ({
            id: x.establishment_id,
            name:
              (
                x.straatbeeld_cases as unknown as {
                  name: string;
                }
              )?.name ?? x.establishment_id,
            status: x.status,
            message: x.message_nl,
            checkedAt: x.last_success_at,
          })),
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request) {
  try {
    await accessGuard(r);
    const body = await r.json();
    if (typeof body.paused !== "boolean")
      throw new DataError("INVALID_INPUT", "Ongeldige instelling.", 422);
    const result = await supabaseAdmin()
      .from("straatbeeld_monitoring")
      .update({ paused: body.paused })
      .eq("municipality", "Schoten")
      .select("municipality");
    if (result.error || !result.data?.length)
      throw new Error("Monitoring not configured");
    return Response.json({ paused: body.paused });
  } catch (e) {
    return failure(e);
  }
}
