import { accessGuard, failure } from "@/server/http";
import { supabaseAdmin } from "@/server/supabase";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await accessGuard(r);
    const { id } = await c.params;
    const update = await supabaseAdmin()
      .from("straatbeeld_research_queue")
      .update({
        next_due_at: new Date().toISOString(),
        priority: 100,
        status: "queued",
      })
      .eq("establishment_id", id)
      .neq("status", "running")
      .select("establishment_id");
    if (update.error) throw update.error;
    return Response.json({
      queued: !!update.data?.length,
      messageNl: update.data?.length
        ? "Hercontrole ingepland; de gemeentelijke worker verwerkt deze met voorrang."
        : "Onderzoek loopt al of deze zaak valt buiten de wachtrij.",
    });
  } catch (e) {
    return failure(e);
  }
}
