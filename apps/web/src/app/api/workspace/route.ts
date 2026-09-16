import { accessGuard, failure } from "@/server/http";
import { listDetails } from "@/server/repository";
export async function GET(request: Request) {
  try {
    await accessGuard(request);
    return Response.json(
      { details: await listDetails({ municipality: "Schoten" }) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
