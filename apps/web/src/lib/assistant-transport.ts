import { AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { z } from "zod";
import { ResearchResult } from "@kbo/core";
import { apiFetch } from "./api";

export const researchRunSchema = z.object({
  id: z.string(), ondernemingsnr: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  result: ResearchResult.nullable(), error: z.string().nullable(),
  model: z.string(), createdAt: z.string(),
  decision: z.object({ beoordeling: z.enum(["bevestigd", "afgewezen"]), value: z.string().nullable(), beslistOp: z.string() }).nullable(),
});
export type ResearchRun = z.infer<typeof researchRunSchema>;
const responseSchema = z.object({ run: researchRunSchema.nullable() });

export async function readResearch(nr: string, init?: RequestInit) {
  const response = await apiFetch(`/api/record/${encodeURIComponent(nr)}/research`, init);
  return responseSchema.parse(await response.json()).run;
}

export async function decideResearch(nr: string, runId: string, body: {
  beoordeling: "bevestigd" | "afgewezen"; value: string | null; idempotencyKey: string;
}) {
  const response = await apiFetch(`/api/record/${encodeURIComponent(nr)}/research/${encodeURIComponent(runId)}/decision`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return researchRunSchema.parse((await response.json()).run);
}

export function createAssistantTransport(nr: string, runId: string) {
  const path = `/api/record/${encodeURIComponent(nr)}/assistant`;
  return new AssistantChatTransport({
    api: path, body: { runId },
    // apiFetch obtains the current token for every send/retry and leaves the stream intact.
    fetch: (_input, init) => apiFetch(path, init),
  });
}
