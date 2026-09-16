import { detail } from "@/server/repository";
import { accessGuard, failure } from "@/server/http";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    accessGuard(r);
    return Response.json({
      detail: await detail((await c.params).id),
      refreshed: false,
      messageNl:
        "Bronverversing is nog niet aangesloten. Bestaand bewijs is behouden.",
    });
  } catch (e) {
    return failure(e);
  }
}
