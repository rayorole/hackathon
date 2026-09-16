# Shared API contract — v1.0.0

Executable source: `packages/contracts/src/index.ts` (Zod schemas + types). No independently invented frontend types. Browser boundary: `apps/web/src/lib/data-client.ts`. IDs are strings; timestamps ISO8601; unknown values null. API responses have no extra data wrapper.

| Method                                                         | Response                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| GET /api/establishments?municipality=Schoten&street=Paalstraat | `{items: Establishment[], coverage: Coverage}`                |
| GET /api/establishments/:id                                    | `Detail` containing establishment, sources, evidence, reviews |
| POST /api/reviews                                              | `Review`, status 201                                          |
| POST /api/establishments/:id/refresh                           | `{detail, refreshed, messageNl}`                              |
| GET /api/export?municipality=Schoten&street=Paalstraat         | UTF-8 CSV, approved changes only                              |
| GET /api/health                                                | configuration/status, no credentials                          |

Review request: `{proposalId, expectedRevision, decision: 'approve'|'reject', correctedValue?: string|null, note?: string}`. Send correctedValue only on approve. Server generates IDs/timestamps and rejects unexpected input fields. Response revision increments; old revision gets 409. Approve/reject can supersede an earlier decision at the next revision, preserving history. A rejection's effectiveValue is null; source fact remains unchanged.

Errors: `{error:{code,message}}`. Expected 400 invalid request; 404 missing record; 409 revision conflict; 422 missing evidence; 501 write backend not connected; 503 DB error. Production server API returns 403 until auth is built. Detail and list payloads are runtime validated by the client.

Current API read limit 1000 is explicit in coverage, no municipality completeness claim. Supabase list filtering uses indexed municipality/street; no pagination yet. `refresh` currently returns refreshed:false and does not change timestamps or imply network retrieval. Browser fixtures have the same methods but localStorage persistence and are not a concurrent multi-user backend.

## Ownership/change protocol

Jochem coordinates edits to contracts/client. Discuss a shape change before committing; update schemas, fixtures, adapters and tests in the same commit. Ray pulls that commit before consuming new fields. Adding UI-only component props does not require a shared contract change.

## Storage mapping

`straatbeeld_cases`: id=text registry/demo establishment identifier; municipality/street=indexable filters; version=optimistic concurrency integer; detail=complete typed JSON payload; updated_at=storage modification time (not evidence retrieval time). Review history lives in detail.reviews so the decision and audit append commit atomically. Registry fact fields remain unchanged by review logic.
