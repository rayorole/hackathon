# Integration contract — backend is authoritative

**User decision: Ray’s frontend/API shape must match Jochem’s data structure, not the reverse.** This supersedes the earlier instruction to adapt backend responses to the existing main routes.

Ray keeps his page designs and frontend work on main. Jochem owns the data/backend. Canonical schemas and TypeScript types: packages/contracts/src/index.ts, package @straatbeeld/contracts, contract version1.0.0. Canonical routes: docs/api-contract.md. Fixtures: packages/contracts/src/fixtures.ts. The straatbeeld_cases persistence model already applied to Supabase is the current backend model; do not replace it with the alternative records/scores/audit schema to accommodate frontend assumptions.

## Changes required on Ray’s side
| Existing main shape | Required contract |
| --- | --- |
| GET /api/straat/:straat returning join rows | GET /api/establishments?municipality=Schoten&street=Paalstraat returning {items,coverage} |
| GET /api/record/:nr with record/zetel/bewijs/score/beslissingen | GET /api/establishments/:id returning {establishment,sources,evidence,reviews}; parent is establishment.parent |
| POST /api/record/:nr/beoordeling with beoordeling/opmerking | POST /api/reviews with proposalId, expectedRevision, decision approve or reject, optional correctedValue on approval and note |
| Record-level confirmed/rejected flag | Per-proposal pending/approved/rejected state plus append-only reviews; use returned revision |
| Confidence score as activity/legal status | Keep activityAssessment, registryStatus, evidence assessment and proposal reviewState distinct; no direct conversion of a score to status |
| Full audit endpoint | Read case review history from Detail.reviews; a global audit page needs an explicitly agreed additional endpoint, not an invented response |
| Refresh/export unspecified | POST /api/establishments/:id/refresh returns {detail,refreshed,messageNl}; GET /api/export returns approved-only CSV |

## Frontend implementation
Import the canonical types/schemas instead of maintaining competing packages/core wire types. Existing Dutch labels, layout and page-specific display models may stay; map canonical fields to them at the frontend boundary. Do not rename backend fields, omit provenance or collapse parent and establishment to fit a screen.

The existing apiFetch bearer-token transport may be retained. Authentication headers, API origin and server framework are transport decisions and do not redefine JSON schemas. Preserve verified officer authorization when combining the apps; the starter’s production API guard must not be disabled as a shortcut. Route handlers must expose the canonical paths regardless of whether hosted in Next or Hono.

Use the shared fixtures while designing pages. Review actions must send proposal ID and expected revision, show409 conflicts, reload after saves, preserve rejection and export only approved changes. Unknown parent/data is null, not fabricated. Treat refreshed:false as no successful refresh.

## Integration gate
Before merging, validate actual list/detail/review responses using the shared Zod schemas and exercise Ray’s interface against our backend: load real record, show parent and dated evidence, approve/reject/edit, reload, reject stale revision, export only approved corrections. Current main is not yet claimed compliant; this document specifies the required change.

Selectively combine backend and frontend; never merge the competing scaffold wholesale. Contract changes require Jochem’s coordination and schema/fixture/client/test updates together.
