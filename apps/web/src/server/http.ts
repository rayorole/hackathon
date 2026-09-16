import "server-only";
import { DataError } from "@straatbeeld/contracts";
import { createClient } from "@/lib/supabase/server";
export async function accessGuard(request: Request) {
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new DataError(
        "ORIGIN_MISMATCH",
        "Aanvraag van een andere oorsprong geweigerd.",
        403,
      );
  }
  const client = await createClient();
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user)
    throw new DataError("UNAUTHENTICATED", "Meld u eerst aan.", 401);
  if (user.app_metadata?.role !== "officer")
    throw new DataError(
      "FORBIDDEN",
      "Uw account heeft nog geen toegang als medewerker.",
      403,
    );
  return user;
}
export function failure(error: unknown) {
  if (error instanceof DataError)
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  console.error(
    "Straatbeeld request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Aanvraag mislukt. Probeer opnieuw.",
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
