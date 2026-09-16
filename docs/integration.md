# Frontend/backend integration — current direction

Ray is designing pages on main using his own resource-derived scaffold. Jochem owns data/backend. This supersedes the previous plan to have both branch from codex/team-setup. Keep Ray’s frontend and merge compatible backend changes into it.

## Existing boundary on main
- Frontend: apps/web; apps/web/src/lib/api.ts exports apiFetch and sends a Supabase bearer token to NEXT_PUBLIC_API_URL (default localhost:3001).
- API shell: apps/api (Hono); requireOfficer validates identity and app_metadata.role=officer. Preserve this authorization boundary.
- Shared current domain: packages/core. Do not replace its shapes with prototype contracts without coordinated adaptation.
- Existing routes: GET /api/straat/:straat; GET /api/record/:nr; POST /api/record/:nr/beoordeling; GET /api/audit. These are the compatibility target, not proof every UI page already consumes them.

## Backend work
Use a main-based integration branch, fetch main before each slice, preserve Ray’s UI, and selectively port normalized KBO/parent/source data, evidence/proposals, persistent review/version checks and approved-only export. The existing schema on main and the prototype straatbeeld_cases table differ; choose one storage adapter behind the API and document it before importing real data. Do not run two competing import/schema paths.

The prototype’s contracts, fixtures, review/export logic and tested Supabase connection are reusable groundwork. Its Next routes, test UI, package/lockfile replacements and deletion of apps/api must not be merged wholesale. Keep prototype history for reference.

Agree list/detail/review response fixtures before connecting designed screens. Preserve the current routes where practical; add explicit compatible fields/endpoints for edit approval, evidence revisions, refresh and export. Check actual pushed frontend calls before changing field names. No assumption that Ray adopted prototype types.

First vertical slice: one real Paalstraat record, parent and dated evidence in Ray’s interface through authenticated API. Next: approve/reject, reload, export. Real AI retrieval and refresh remain unfinished.
