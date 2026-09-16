import { z } from "zod";
import { candidateReviewRequestSchema } from "@straatbeeld/contracts/candidates";
import { DataError } from "@straatbeeld/contracts";
import { accessGuard, failure } from "@/server/http";
import { reviewCandidate } from "@/server/candidates";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await accessGuard(request);
    const { id } = await context.params;
    const parsed = candidateReviewRequestSchema.safeParse(await request.json().catch(() => null));
    if (!z.uuid().safeParse(id).success || !parsed.success) throw new DataError("INVALID_REQUEST", "Ongeldige beoordeling.", 400);
    return Response.json(await reviewCandidate(id, parsed.data, actor.id));
  } catch (e) { return failure(e); }
}
