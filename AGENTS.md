# Straatbeeld — shared agent instructions

Read README.md, docs/status.md, docs/api-contract.md and the current owner's handoff before coding. The owner is the human operating this session; ask only if unclear. Do not read any personal Obsidian vault or other private projects unless your human explicitly authorizes it. Everything needed for shared context is here.

## Scope

Build Challenge 1 for Schoten/Paalstraat: browse establishment → linked parent → dated evidence → review/correct → approved export. UI and officer-facing explanations in Dutch. Deadline 16 September 2026 16:30 Brussels; video buffer is essential. Map, voice and extra municipalities are stretch only.

## File ownership

- Ray: `apps/web/src/components/**`, `apps/web/src/app/**` EXCEPT `apps/web/src/app/api/**`, UI assets under `apps/web/public/**`.
- Jochem: `apps/web/src/server/**`, `apps/web/src/app/api/**`, `supabase/**`, `scripts/**`, `data/**`.
- Shared, coordinated changes: `packages/contracts/**`, `apps/web/src/lib/data-client.ts`, docs, root configuration and lockfile. Jochem coordinates dependency/config changes. Do not silently change shared request/response shapes.
- Each human/assistant uses their own branch/checkout. Work only your assigned slice. Do not implement your teammate's assigned queue or overwrite their branch.

## Contract and source truth

Jochem’s packages/contracts and docs/api-contract.md are authoritative. Ray’s main frontend/API adapter must conform to them. Preserve Ray’s UI and authorization, but never reshape the backend to fit the older packages/core or Dutch-route payloads. docs/integration.md lists required frontend adaptations.

Import types/schemas from `@straatbeeld/contracts`, call the DataClient interface. Keep identifiers as strings and null for unknown facts. Preserve registry data; officer approval changes the municipal working overlay, not KBO. Evidence, legal registry status, activity assessment and officer review status are separate.

A missing website does not prove closure. Absence from the partial sample does not prove absence from KBO. Parent seat is not the local establishment address. Source retrieval time is not an observation/snapshot date. Fixture data is explicitly fictional. Do not invent factual evidence or confidence percentages.

## Engineering

- npm workspaces; exact dependency versions and one root package-lock.json. Never create nested lockfiles or additional repos.
- Server credentials stay server-only. No secrets in logs, fixtures, docs or NEXT_PUBLIC variables.
- Keep RLS enabled, no anonymous writes. Production API stays blocked until real authentication/authorization is implemented and tested. Never flip permissions to fix a connection issue.
- Supabase migrations owned by Jochem; create through pinned CLI. No resets against shared cloud projects. Review target project before writes.
- Tests for important invariants: review revision conflicts, rejected/pending changes excluded from export, source references preserved. Run npm run check and npm run build before handoff.
- No paid AI calls in tests. Source-refresh stub is honest; do not fake successful fetching.
- Update docs/status.md for completed work, known limitations and next integration step. Commit working slices; do not claim tests or remote updates without verification.
