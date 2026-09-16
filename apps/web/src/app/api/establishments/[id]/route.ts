import { detail } from "@/server/repository";
import { accessGuard, failure } from "@/server/http";
export async function GET(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    await accessGuard(r);
    return Response.json(await detail((await c.params).id));
  } catch (e) {
    return failure(e);
  }
}
