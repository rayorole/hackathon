import { z } from "zod";
export const CONTRACT_VERSION = "1.0.0";
export const assessmentSchema = z.enum([
  "supported",
  "conflicting",
  "insufficient",
  "needs_check",
]);
export const addressSchema = z.object({
  street: z.string(),
  houseNumber: z.string(),
  postalCode: z.string(),
  municipality: z.string(),
});
export const sourceSchema = z.object({
  id: z.string(),
  url: z.url(),
  publisher: z.string(),
  kind: z.enum(["registry", "website", "observation"]),
  retrievedAt: z.iso.datetime(),
  observedAt: z.iso.datetime().nullable(),
  registrySnapshotDate: z.string().nullable(),
  cached: z.boolean(),
  isDemo: z.boolean(),
});
export const evidenceSchema = z.object({
  id: z.string(),
  establishmentId: z.string(),
  sourceId: z.string(),
  excerpt: z.string(),
  field: z.string(),
  observedValue: z.string().nullable(),
  scope: z.enum(["local", "enterprise", "unknown"]),
  assessment: z.enum(["supports", "conflicts", "insufficient"]),
});
export const proposalSchema = z.object({
  id: z.string(),
  establishmentId: z.string(),
  field: z.string(),
  baselineReviewId: z.string().nullable().optional(),
  supersededBy: z.string().optional(),
  before: z.string().nullable(),
  proposedValue: z.string().nullable(),
  reasonNl: z.string(),
  evidenceIds: z.array(z.string()),
  revision: z.number().int().nonnegative(),
  reviewState: z.enum(["pending", "approved", "rejected"]),
});
export const enterpriseSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  registeredAddress: addressSchema.nullable(),
  registryStatus: z.string().nullable(),
  sourceId: z.string(),
});
export const establishmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: addressSchema,
  parentEnterpriseId: z.string().nullable(),
  parent: enterpriseSchema.nullable(),
  registryStatus: z.string().nullable(),
  sourceId: z.string(),
  activityAssessment: assessmentSchema,
  evidenceIds: z.array(z.string()),
  proposals: z.array(proposalSchema),
  isDemo: z.boolean(),
});
export const reviewRequestSchema = z
  .object({
    proposalId: z.string().min(1),
    expectedRevision: z.number().int().nonnegative(),
    decision: z.enum(["approve", "reject"]),
    correctedValue: z.string().max(2000).nullable().optional(),
    note: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === "reject" && v.correctedValue !== undefined)
      ctx.addIssue({
        code: "custom",
        message: "A rejection cannot include a corrected value.",
      });
  });
export const reviewSchema = z.object({
  reviewId: z.string(),
  reviewerId: z.string().optional(),
  proposalId: z.string(),
  decision: z.enum(["approve", "reject"]),
  effectiveValue: z.string().nullable(),
  reviewedAt: z.iso.datetime(),
  revision: z.number().int().positive(),
  note: z.string().nullable(),
});
export const detailSchema = z.object({
  establishment: establishmentSchema,
  sources: z.array(sourceSchema),
  evidence: z.array(evidenceSchema),
  reviews: z.array(reviewSchema),
});
export const coverageSchema = z.object({
  mode: z.enum(["fixtures", "supabase"]),
  labelNl: z.string(),
  completeMunicipality: z.boolean(),
  registrySnapshotDate: z.string().nullable(),
});
export const listResponseSchema = z.object({
  items: z.array(establishmentSchema),
  coverage: coverageSchema,
});
export const refreshResponseSchema = z.object({
  detail: detailSchema,
  refreshed: z.boolean(),
  messageNl: z.string(),
});
export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type Establishment = z.infer<typeof establishmentSchema>;
export type Detail = z.infer<typeof detailSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ListResponse = z.infer<typeof listResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type Filters = { municipality?: string; street?: string };
export interface DataClient {
  list(filters?: Filters): Promise<ListResponse>;
  detail(id: string): Promise<Detail>;
  review(request: ReviewRequest): Promise<Review>;
  refresh(id: string): Promise<RefreshResponse>;
  exportCsv(filters?: Filters): Promise<string>;
}
export class DataError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "DataError";
  }
}
export function matches(e: Establishment, f: Filters = {}) {
  return (
    (!f.municipality || e.address.municipality === f.municipality) &&
    (!f.street || e.address.street === f.street)
  );
}

export const monitoringSchema = z.object({
  municipality: z.string(),
  paused: z.boolean(),
  online: z.boolean(),
  heartbeatAt: z.string().nullable(),
  lastPlannedAt: z.string().nullable(),
  directoryCheckedAt: z.string().nullable(),
  directoryCandidates: z.number(),
  researchStarted: z.number(),
  researchLimit: z.number(),
  total: z.number(),
  queued: z.number(),
  running: z.number(),
  checked: z.number(),
  noSource: z.number(),
  failed: z.number(),
  blocked: z.number(),
  nextDueAt: z.string().nullable(),
  jobs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      message: z.string().nullable(),
      checkedAt: z.string().nullable(),
    }),
  ),
});
export type Monitoring = z.infer<typeof monitoringSchema>;

/** Latest still-approved decision per field. Rejecting a new proposal preserves earlier approval. */
export function acceptedFields(detail: Detail) {
  const fields = new Map<
    string,
    { proposal: Detail["establishment"]["proposals"][number]; review: Review }
  >();
  for (const review of detail.reviews) {
    const proposal = detail.establishment.proposals.find(
      (p) => p.id === review.proposalId,
    );
    if (
      !proposal ||
      proposal.reviewState !== "approved" ||
      review.decision !== "approve" ||
      detail.reviews.findLast((r) => r.proposalId === proposal.id) !== review
    )
      continue;
    fields.set(proposal.field, { proposal, review });
  }
  return [...fields.values()];
}

/** Rebase an unreviewed suggestion after a concurrent officer decision, without changing its evidence. */
export function renewPendingBaselines(detail: Detail): Detail {
  const next = structuredClone(detail);
  for (const p of [...next.establishment.proposals]) {
    if (
      p.reviewState !== "pending" ||
      p.supersededBy ||
      p.baselineReviewId === undefined
    )
      continue;
    const current = acceptedFields(next).find(
      (x) => x.proposal.field === p.field,
    );
    const baseline = current?.review.reviewId ?? null;
    if (p.baselineReviewId === baseline) continue;
    const id = p.id + ":baseline:" + (baseline ?? "none");
    if (!next.establishment.proposals.some((x) => x.id === id))
      next.establishment.proposals.push({
        ...p,
        id,
        baselineReviewId: baseline,
        before: current?.review.effectiveValue ?? null,
        revision: 0,
      });
    p.supersededBy = id;
  }
  return next;
}
