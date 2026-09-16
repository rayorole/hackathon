# Dedicated Supabase project

**Already applied on 16 September:** project `qsyxwwllwhhrwjhrfehf`. Do not rerun the initial CREATE TABLE migration on this database. The SQL editor was used because CLI database connectivity stalled; remote CLI migration history is not yet recorded. Reconcile history before a future `db push`.


Project reference: **qsyxwwllwhhrwjhrfehf**. Ray has created the project/organisation. Use only that project's credentials. An organisation alone is not a database; confirm the project URL and reference before applying a migration.

## Local setup

Set in ignored `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_DATA_MODE=api
DATA_BACKEND=supabase
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR-SERVER-SECRET
```

Share secret values through a private channel, never issues/chat logs or Git. The optional publishable key is reserved for future user-auth wiring; it cannot replace the server secret in this adapter.

## Schema

The tracked migration under `supabase/migrations/` creates only `public.straatbeeld_cases` plus indexes, RLS and explicit grants. Jochem owns migrations. Apply it once to this project's SQL editor or through the pinned CLI after inspecting `npx supabase --help`, `link --help`, `db push --help`. API keys cannot execute arbitrary schema DDL. CLI deployment requires project access/login and may require its database password. Never use db reset against the shared cloud project.

After applying:

```sh
npm run db:check
npm run db:seed
npm run db:check
npm run dev
```

Seed is additive: inserts missing `demo-*` rows and does not overwrite existing reviews. It imports no real Intelead data. Source importer is Jochem's next task.

## Access model

Server-only client; service key never reaches browser. RLS enabled, anon/authenticated privileges revoked, only service_role reads/inserts/updates. No public policies and no DELETE grant. Next's server API is local-development-only until real user authentication and authorization are added. Do not remove this safeguard as a deployment shortcut. Browser fixture mode still runs independently.

## Verification

`npm run db:check` checks table access without printing credentials. Verify three seeded cases, review persistence after reload, rejection absent from export and a stale revision 409. Check direct publishable-key table access cannot read/write cases. CLI migration success alone does not prove the full workflow.
