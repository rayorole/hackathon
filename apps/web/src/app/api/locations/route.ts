import { accessGuard, failure } from "@/server/http";
import locations from "@/server/locations.json";
export async function GET(r: Request) {
  try {
    await accessGuard(r);
    return Response.json(locations);
  } catch (e) {
    return failure(e);
  }
}
