# Straatbeeld

PROV-AI Challenge 1 — a Dutch municipal workflow to inspect local business evidence and approve corrections. Team: Jochem (data/server) and Ray (officer UI). Submission deadline: **16 September 2026, 16:30 Europe/Brussels**. Target submission 16:15, feature freeze 15:00. One three-minute YouTube video is mandatory.

## Start in two minutes

Requires Node 22.16+ (or 24) and npm. From the repository root:

```sh
npm ci
test -f apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open http://127.0.0.1:3100. Port 3100 avoids an existing app on 3000. Defaults work without credentials and make no paid requests. Click **Laad Paalstraat**, choose a fictional case, approve/reject, reload and export. This is a developer integration harness, not the finished product design.

Do not replace an existing `.env.local`; add missing variables manually. Never commit credentials.

## Two independent coding sessions

- Ray: branch `codex/officer-ui`, read [Ray's handoff](docs/ray.md).
- Jochem: branch `codex/data-api`, read [Jochem's handoff](docs/jochem.md).
- Both: read [AGENTS.md](AGENTS.md), [API contract](docs/api-contract.md) and [status](docs/status.md).
- Repository base: **`codex/team-setup`**. Jochem explicitly chose this scaffold; the separate scaffold on `main` is preserved but is not the build base. Check out your branch from `origin/codex/team-setup`; push your branch and open a PR. Keep integrations small and integrate through `codex/team-setup`.

```sh
git fetch origin
git switch -c codex/officer-ui origin/codex/team-setup
```

Jochem substitutes `codex/data-api`. If the branch already exists, use `git switch <branch>` rather than creating it again. Use one checkout per person. No force pushes.

## Monorepo

```text
apps/web/             Next.js UI, HTTP routes, server adapter
packages/contracts/  Zod schemas, TS types, fixtures and review/export logic
data/kbo/            original public sample, metadata and attribution
docs/                shared context and owner-specific task queues
docs/resources/      public event guides, original PDFs and README
supabase/            versioned project schema migrations
scripts/             connection checks and non-destructive fixture seed
```

## Data modes

**Fixtures (default):** `NEXT_PUBLIC_DATA_MODE=fixtures`. Browser-local demo cases, persisted in localStorage. Each browser has independent state; two tabs can overwrite fixture state. The UI labels these as fictional; never call them live KBO evidence.

**Supabase API:** set `NEXT_PUBLIC_DATA_MODE=api`, `DATA_BACKEND=supabase`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in `apps/web/.env.local`. Apply the project migration once, run `npm run db:check`, then `npm run db:seed`, restart Next. See [Supabase setup](docs/supabase.md). Seed only adds missing fictional cases and does not reset decisions.

**HTTP fixture reads:** `NEXT_PUBLIC_DATA_MODE=api`, `DATA_BACKEND=fixtures` provides read-only fixture endpoints. Review POST returns 501 intentionally; use browser fixtures or Supabase for working review saves.

Production API requests return403 until authenticated access is implemented; the dev server binds loopback. Static fixture mode can still render in a production build. Do not remove this guard to expose a service-key-backed API publicly.

## Checks

```sh
npm run check
npm run build
```

CI runs both on pushes/PRs without secrets. `GET /api/health` describes configured mode, not proof of DB connectivity; `npm run db:check` verifies the DB. Contracts are version 1.0.0. No cloud schema, credentials or access are assumed merely because the app builds.

## Event and resources

[Challenge brief](https://ap.ns2agi.com/challenges/challenge-1-right-service-first-time) · [Submission form](https://docs.google.com/forms/d/e/1FAIpQLSeqs2xIbsuPM4ddiuov11qoehQfs3mn9ZECKnKCjKAHzXYYGA/viewform) · [Local source index](docs/sources.md).

The starter contains no private Intelead code, data export, personal vault notes or credentials. Original KBO sample licence and attribution are in `data/kbo/source-metadata.json`. Pre-existing component/data reuse eligibility still needs organiser confirmation.
