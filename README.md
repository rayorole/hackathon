# Straatbeeld

An evidence review desk for Schoten, built for the PROV-AI hackathon. Ray owns the officer-page design; Jochem owns the canonical backend and data contracts.

See [the shared setup and API guide](docs/integration-mvp.md).

```sh
npm install
# Fill apps/web/.env.local using apps/web/.env.example
npm run dev
```

The Next.js app serves both UI and authenticated API routes. The earlier `apps/api` scaffold is inactive. Canonical types live in `packages/contracts`; frontend adapters must conform to these types.

```sh
npm run check
npm run build
```

The dataset is a partial sample. Human approval is required before export. AI refresh currently supports selected verified source URLs and must use the designated backend's existing shared $10 budget ledger.
