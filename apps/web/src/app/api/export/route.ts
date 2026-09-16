import { exportCsv } from "@/server/repository";
import { accessGuard, failure, filters } from "@/server/http";
export async function GET(r: Request) {
  try {
    accessGuard(r);
    return new Response(await exportCsv(filters(r)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=straatbeeld-reviewed.csv",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
