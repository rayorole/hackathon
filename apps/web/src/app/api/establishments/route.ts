import { list } from "@/server/repository";
import { accessGuard, failure, filters } from "@/server/http";
export async function GET(r: Request) {
  try {
    await accessGuard(r);
    return Response.json(await list(filters(r)));
  } catch (e) {
    return failure(e);
  }
}
