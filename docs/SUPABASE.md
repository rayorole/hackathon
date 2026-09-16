# Supabase setup

Project: qsyxwwllwhhrwjhrfehf.

- Root .env.local: DATABASE_URL (Supabase Connect dialog, pooler URI), SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY, WEB_ORIGIN.
- apps/web/.env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_API_URL. Example files contain no keys.
- npm run dev starts web and API.
- Auth uses existing email/password accounts. Create or invite officers through Supabase
  administration. Set app_metadata.role to "officer" using the admin API/SQL; never
  user_metadata. Login does not grant officer access by itself.
- Next.js refreshes cookie sessions in proxy.ts. Hono validates bearer tokens against
  Supabase Auth on every protected request, including the administrator-assigned role.
- Drizzle uses a server-only Postgres connection with prepared statements disabled for
  pooler compatibility. Never expose this connection string to the browser.
- Current domain tables are accessed through Hono. Enable RLS and revoke anon and
  authenticated Data API access before importing records. No browser table policies are
  needed for this architecture. The database owner connection bypasses RLS, so Hono
  authorization is mandatory.
- Audits record the verified user UUID. Clients cannot choose the officer identity.
- MCP: codex mcp login supabase --scopes organizations:read,projects:read,database:read,database:write
  The project-scoped server is registered in local Codex configuration. OAuth must
  complete and tools must be refreshed before remote schema operations.
