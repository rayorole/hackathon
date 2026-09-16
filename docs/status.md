> **Authoritative integration direction:** Jochem’s `packages/contracts` data model and documented API are the source of truth. Ray retains his frontend/page designs on `main` and adapts its API calls and view models to this contract. Preserve authentication without changing payload shapes. Do not merge the entire scaffold. See `docs/integration.md`.

# Current status

## Working starter

- npm workspace with Next.js app and shared Zod/TypeScript contracts.
- Three explicitly fictional cases; browser adapter supports list/detail/review/refresh response/export with localStorage review history.
- Supabase server adapter, compare-and-swap review save and approved-only CSV export.
- Integration harness UI, local connection/seed commands, and CI checks.
- Sanitized public event context and starter data inside this repo; no dependency on a private vault.

## Remaining product work

- Ray: actual Dutch officer interface, search/filtering, edit-approve flow and UX polish.
- Jochem: real VKBO import/parent lookup, actual source retrieval + AI, refresh implementation and public authentication if hosting.
- Source refresh deliberately reports not implemented. All initial cases are fictional. No paid provider calls are made by the starter.
- Dedicated Supabase `qsyxwwllwhhrwjhrfehf`: schema applied through SQL editor, three fictional cases seeded. Live list/detail, browser approval, saved rejection, stale revision 409, foreign-origin 403 and approved-only CSV verified. RLS enabled; direct anon/auth access revoked.
- Browser approval is retained on demo case 1; demo case 2 has a setup-test rejection. Seed deliberately preserves this history.
- Working base is `codex/team-setup`, not the alternative scaffold on `main`, per Jochem’s explicit instruction.

## Integration checkpoints

First real record through the stable API within 60–75 minutes of independent coding. Merge working slices frequently. Both review the flow with an officer before scope freeze. Freeze around 15:00, video/upload buffer, submit by 16:15 (hard 16:30 Brussels). Original clock does not restart.

## Real-data slice — 16 September

- Implemented checksum-verified, validated and additive KBO importer; scripts are included in typechecking.
- Imported 543 real establishments; 27 real Paalstraat establishments are available through the canonical API. Live list/export excludes demo rows.
- 28 sample parent links plus21 fresh Paalstraat parent lookups; six lookups remain unresolved. Parent/source timestamps stay separate from sample data.
- No AI evidence or correction proposals invented. Real records initially have insufficient activity evidence; repeat import preserves existing records and reviews.
- Next: source retrieval/analysis and version-safe refresh, then connect Ray’s page designs to the canonical data contract. AI provider credential/spend limit requested; not configured at this checkpoint.
