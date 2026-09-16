import "server-only";
import { DataError } from "@straatbeeld/contracts";
export function accessGuard(request: Request) {
  // Local development integration only. Implement authenticated access before any hosted API use.
  if (process.env.NODE_ENV === "production")
    throw new DataError(
      "AUTH_NOT_IMPLEMENTED",
      "Live API is geblokkeerd tot authenticatie is aangesloten.",
      403,
    );
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get("host") ?? new URL(request.url).host}`;
    if (origin && origin !== expectedOrigin)
      throw new DataError(
        "ORIGIN_MISMATCH",
        "Aanvraag van een andere oorsprong geweigerd.",
        403,
      );
  }
}
export function failure(error: unknown) {
  if (error instanceof DataError)
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Aanvraag mislukt. Controleer de serverconfiguratie.",
      },
    },
    { status: 500 },
  );
}
export function filters(request: Request) {
  const q = new URL(request.url).searchParams;
  return {
    municipality: q.get("municipality") ?? undefined,
    street: q.get("street") ?? undefined,
  };
}
