import { CONTRACT_VERSION } from "@straatbeeld/contracts";
export async function GET() {
  return Response.json({
    status: "ok",
    contractVersion: CONTRACT_VERSION,
    backend: process.env.DATA_BACKEND === "supabase" ? "supabase" : "fixtures",
    sourceRefresh: "not-implemented",
    productionApi: "blocked-until-auth",
  });
}
