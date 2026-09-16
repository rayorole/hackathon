# Ray — officer UI

You can start now. Use `codex/officer-ui` from `origin/codex/team-setup`; `npm ci`, copy .env.example if needed, `npm run dev`. Keep default fixture mode so backend progress never blocks you.

## Your files

`apps/web/src/components/**`, pages/layout/styles in `apps/web/src/app/**` except `api/**`, and `apps/web/public/**`. Do not edit server routes, database migrations, seed/import scripts or shared contracts without coordinating.

## First deliverable

Replace `components/starter.tsx` with the Dutch officer workflow, retaining its working client integration:

1. Schoten/Paalstraat list, name search and review-needed filters.
2. Focused detail view: establishment, nullable parent and separate registered seat.
3. Source URL, publisher, excerpt, retrieval/observation date and conflict/uncertainty state.
4. Approve, reject and edit-then-approve (send correctedValue with decision approve). Refresh record after review; surface REVISION_CONFLICT with reload guidance.
5. Approved-only CSV export, refresh feedback and visible fixture banner.

Use `dataClient` from `@/lib/data-client` exclusively. See `packages/contracts/src/index.ts` and docs/api-contract.md. Three deterministic cases cover supported, conflicting and insufficient evidence. Decisions persist on your browser only. No fake claims about real businesses.

## Acceptance

Can inspect all three cases; missing parent is explicit; each proposed change shows before/after and evidence; rejection persists on reload; edited approval exports the edited value. Loading/errors stay visible and usable. Keep UI accessible and usable on laptop widths.

Before changing the API shapes, agree with Jochem. First integration checkpoint: one real case through the existing adapter. Send your branch/PR to Jochem; no need to share personal assistant history. You own the interface design; starter styling is disposable scaffolding.
