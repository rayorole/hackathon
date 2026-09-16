# Municipal monitoring — current implementation

Branch: `codex/municipal-monitoring`, based on `codex/task-first-ux`. Do not merge into main automatically. Preserve Ray's uncommitted design changes before switching or merging.

## Team setup

Both laptops run the same Next.js application against the existing Supabase project. After fetching this branch, run `npm install`, retain `apps/web/.env.local`, and run `npm run dev`. The usual public and server Supabase keys are needed; do not copy secrets into git or chat. No new environment variable is required for Ray's UI. `GET /api/monitoring` is authenticated and supplies the shared queue and progress.

**Only Jochem runs `npm run monitor`.** It uses the existing authoritative `AI_BUDGET_FILE` and OpenAI key. Ray must not initialize a second ledger or launch a paid worker. Manual refresh now schedules a recheck in Supabase; it does not make AI calls on Ray's laptop. The existing refresh response shape is retained.

The additive `20260916121111_municipal_monitoring.sql` was applied transactionally through Supabase's SQL editor because the CLI's temporary database login failed. Do not reset or seed the project. The migration is idempotent to permit subsequent CLI history reconciliation. Dashboard installation is verified through real service-role table/RPC requests; CLI migration-history reconciliation remains separate from application functionality.

## Scope and execution

- All 543 real known Schoten establishments are enrolled once, regardless of street. The imported inventory remains a partial KBO sample.
- One local worker plans every 60 seconds and processes up to ten due items per pass. Closing the browser does not stop it; sleeping/stopping the Mac does. There is no hosted uptime guarantee.
- A database lease prevents a second worker acquiring this municipality. Claims have a UUID and three-minute lease; expired claims can be recovered. A case update and its completed attempt commit in the same RPC transaction using case-version compare-and-swap. Existing officer decisions cannot be overwritten by stale research.
- Every attempt records an outcome. Successful source checks recur after seven days; no matching source after thirty days; failed/budget-blocked work after one day. These are prototype defaults, not a freshness guarantee.
- Discovery reads the public Geniet van Schoten directory and matches name tokens plus street, exact house number, postcode and municipality. It currently finds 93 directory entries and six matches in the sample, including curated official links for Amplifon and Trixxo. Ambiguous/unmatched entries are not imported as invented KBO records.
- Only approved HTTPS domains are fetched, with redirects disabled, bounded bytes and timeouts. AI receives public source snippets, not private Intelead data.
- Content hashes include extractor version. Unchanged source checks reuse previous extraction and retain observation dates. New/changed sources produce grounded evidence and pending proposals; neither contact details nor opening hours prove activity or closure.
- The initial paid analysis tranche is capped at ten, independently of the existing shared $10 ledger. Unchanged-source checks remain available after the tranche cap. No reservation reset or budget refund was introduced.

## Officer flow and contracts

Start retains review and search as the primary actions. A municipal monitoring panel displays enrolled, source-checked, waiting and unresolved counts, worker status and a searchable paginated queue. Progress concerns research, never proven trading activity. Pause/resume is available in the planning disclosure; already-running source work may finish. Other pages retain their existing structured UI.

- `GET /api/monitoring`: `monitoringSchema` in `packages/contracts`; the `jobs` array contains the bounded sample's queue, without source text/secrets.
- `POST /api/monitoring`: `{ "paused": true | false }`; officer authorization and same-origin checks. Does not reset quota.
- `POST /api/establishments/:id/recheck`: prioritize a durable queue item; repeated requests cannot create another row.
- Existing `POST .../refresh`: same effect, preserves the prior `RefreshResponse` contract.
- Proposals optionally carry `baselineReviewId` and `supersededBy`. Reviewed history is retained. A new rejection leaves the previous accepted value intact. `acceptedFields()` is the shared resolver for UI/export; one current accepted value per field. Superseded proposals and conflicting baselines cannot be approved.

## Verified / remaining

Verified: 543 enrolled; six real cases researched; genuine pending proposals appear in the authenticated app; anonymous queue access is denied; competing worker planning/claim is rejected; unit tests cover changed proposals, stale baseline, rejection preservation, unique export, exact source grounding, safe directory identity and the shared budget lock.

The core municipal loop is implemented. Remaining larger-plan work: structured officer observations/activity reports without a proposal; unmatched-candidate resolution; complete registry pagination/refresh; per-source check rows and richer run history; administrator-audited control changes; deployment supervision; full municipality configuration/tenant isolation and a second municipality acceptance test. Do not present these as shipped, or claim that every business has been researched successfully.

The local SQL functions and source adapter are deliberately small, replaceable building blocks. Municipality text is a database scope, but Schoten source/UI configuration remains wired specifically to this MVP. Porting requires configuring and verifying a new adapter, inventory and map scope.
