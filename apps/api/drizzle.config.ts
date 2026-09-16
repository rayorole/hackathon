import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "drizzle-kit";

// drizzle-kit runs this config in its own process, which does not inherit our
// --env-file flag. Load .env.local here so `npm run db:push` needs no ceremony.
// It bundles this file to CJS, so import.meta.dirname is unavailable — drizzle-kit
// always runs from the workspace root (apps/api), so resolve from cwd.
const envPath = join(process.cwd(), "..", "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]!]) {
      process.env[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local at the repo root.");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
} satisfies Config;
