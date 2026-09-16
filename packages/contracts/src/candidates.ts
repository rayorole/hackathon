import { z } from "zod";
import { DataError } from "./index";
const text = (max: number) => z.string().trim().min(1).max(max);
export const candidateRequestSchema = z.object({
  id: z.uuid(), name: text(200),
  address: z.object({ street: text(200), houseNumber: text(30), postalCode: z.string().regex(/^\d{4}$/), municipality: text(100) }).strict(),
  source: text(200),
  sourceUrl: z.url().max(2000).refine(value => ["https:", "http:"].includes(new URL(value).protocol) && !new URL(value).username && !new URL(value).password),
  observation: text(2000),
  observedAt: z.iso.date().refine(value => value !== "1900-01-01" && value !== "9999-12-31"),
}).strict();
export const candidateReviewRequestSchema = z.object({ expectedRevision: z.number().int().nonnegative(), decision: z.enum(["approve", "reject"]), note: z.string().trim().max(2000).default("") }).strict();
export const candidateSchema = candidateRequestSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]), revision: z.number().int().nonnegative(),
  createdBy: z.string().min(1), createdAt: z.iso.datetime(),
  review: z.object({ decision: z.enum(["approve", "reject"]), reviewerId: z.string().min(1), reviewedAt: z.iso.datetime(), note: z.string() }).nullable(),
});
export type Candidate = z.infer<typeof candidateSchema>;
export type CandidateRequest = z.infer<typeof candidateRequestSchema>;
export type CandidateReviewRequest = z.infer<typeof candidateReviewRequestSchema>;
export function createCandidate(request: CandidateRequest, actor: string, now: string): Candidate {
  if (request.observedAt > now.slice(0,10)) throw new DataError("INVALID_DATE", "Een waarneming kan niet in de toekomst liggen.", 400);
  return candidateSchema.parse({ ...request, status: "pending", revision: 0, createdBy: actor, createdAt: now, review: null });
}
export function decideCandidate(candidate: Candidate, request: CandidateReviewRequest, actor: string, now: string): Candidate {
  if (candidate.revision !== request.expectedRevision || candidate.status !== "pending") throw new DataError("REVISION_CONFLICT", "Deze melding is al beoordeeld. Laad de meldingen opnieuw.", 409);
  return candidateSchema.parse({ ...candidate, status: request.decision === "approve" ? "approved" : "rejected", revision: candidate.revision + 1, review: { decision: request.decision, reviewerId: actor, reviewedAt: now, note: request.note } });
}
