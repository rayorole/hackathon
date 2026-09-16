import { candidateRequestSchema } from "@straatbeeld/contracts/candidates";
import { DataError } from "@straatbeeld/contracts";
import { accessGuard, failure } from "@/server/http";
import { listCandidates, reportCandidate } from "@/server/candidates";
export async function GET(request: Request) {
  try { await accessGuard(request); return Response.json({ items: await listCandidates() }, { headers: { "Cache-Control": "private, no-store" } }); } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const actor = await accessGuard(request);
    const parsed = candidateRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new DataError("INVALID_REQUEST", "Vul naam, adres, bron, waarneming en een geldige datum in.", 400);
    return Response.json(await reportCandidate(parsed.data, actor.id), { status: 201 });
  } catch (e) { return failure(e); }
}
