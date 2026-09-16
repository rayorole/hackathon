# Source analysis and refresh

The canonical API contract is unchanged. POST `/api/establishments/:id/refresh` now performs real retrieval and AI extraction for explicitly configured establishment/source pairs. Current targets: Amplifon `2296242396` (own branch page and Schoten directory), TRIXXO `2286527055` (own branch page; retrieval may fail). Other establishments return refreshed:false with an explanation. This is a narrow working slice, not automated web discovery for all543 records.

## Evidence and human review

- Fetch only server-configured HTTPS URLs, no caller-supplied URLs. Reject redirects, oversized/non-HTML responses and pages without the local street/house number.
- Clean HTML and present numbered original text fragments to the model. The model selects fragments and literal values; backend copies excerpts from the fetched text and rejects unsupported values/references. Source content is untrusted data, not instructions.
- Uses pinned `gpt-4.1-mini-2025-04-14`, default service tier, Responses structured outputs, store:false and at most2000 output tokens. Only public local-business context and fetched public text are sent.
- Extracted observations may concern telephone, email, opening hours (including partial schedules), or local service. They are not proof of legal status, physical opening or closure.
- New proposals are pending. Existing proposals, decisions and their evidence links remain unchanged; refresh appends evidence and creates proposals only for previously unproposed fields. Changed evidence for an already-proposed field requires officer reassessment; the system does not silently supersede an approved/rejected proposal.
- A version-checked database write rejects changes when a review races with refresh. No partial overwrite of the case.
- Unchanged successfully fetched content avoids another AI request. Failed fetches preserve prior evidence; missing evidence is unknown. No human approval is performed by the extractor.

## Authorized $10 cap

One persistent local ledger is used by **Jochem’s backend**, with AI_BUDGET_FILE pointing to its absolute path. Initialize once with `npm run ai:init-budget`; the command refuses to overwrite an existing file. `.local/` and credentials are ignored by Git. Do not initialize another independent ledger on Ray’s machine or run the key outside this backend if relying on this cap. This is an application limit, not an account-wide OpenAI billing limit.

Before each paid request the process takes an exclusive file lock and durably reserves $0.10. Maximum100 requests, no automatic renewal/refund/reset. Request body <=100KB, output<=2000 tokens, fixed model and standard tier keep maximum estimated request cost below the reservation at verified prices. Failed, timed-out and rejected requests retain their reservations. Unknown spend is therefore covered conservatively. Successful response usage also records known actual cost; it is informational and does not increase the available budget. Lock failures, missing/invalid ledgers and exhaustion block calls. A crash can leave a lock; investigate before manually releasing it, never reset the ledger to resolve it.

Before any distributed deployment, replace this local ledger with a single shared budget store. Public server API remains blocked pending combined-app officer authentication. Ray’s existing authentication is retained during integration, not replaced with unauthenticated access.

## Run

Set OPENAI_API_KEY and absolute AI_BUDGET_FILE in ignored apps/web/.env.local. The current machine is already initialized; do not rerun initialization.

`npm run ai:research -- 2296242396` runs the same extraction and compare-and-swap persistence as the API. Review the pending proposals in detail, then use the existing officer review endpoint. `npm run check` runs offline grounding, review-preservation and budget/concurrency tests without paid calls.

References: [model and token prices](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [structured output format](https://developers.openai.com/api/docs/guides/structured-outputs). Prices verified16 September2026: $0.40/M input, $1.60/M output; cached input discounts deliberately ignored in reservations.
