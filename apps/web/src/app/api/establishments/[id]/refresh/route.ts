import { refresh } from "@/server/repository";
import { accessGuard, failure } from "@/server/http";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await accessGuard(r);
    return Response.json(await refresh((await c.params).id));
  } catch (e) {
    return failure(e);
  }
}
