import { reviewRequestSchema, DataError } from "@straatbeeld/contracts";
import { review } from "@/server/repository";
import { accessGuard, failure } from "@/server/http";
export async function POST(r: Request) {
  try {
    accessGuard(r);
    let body: unknown;
    try {
      body = await r.json();
    } catch {
      throw new DataError("INVALID_REQUEST", "Ongeldige JSON.", 400);
    }
    const parsed = reviewRequestSchema.safeParse(body);
    if (!parsed.success)
      throw new DataError("INVALID_REQUEST", "Ongeldige beoordeling.", 400);
    return Response.json(await review(parsed.data), { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
