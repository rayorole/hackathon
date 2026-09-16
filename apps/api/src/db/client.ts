import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres " +
      "(Supabase: Project Settings -> Database -> Connection string -> URI).",
  );
}

// Nothing here knows or cares that it is Supabase — any Postgres works (AGENTS.md §6).
export const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
