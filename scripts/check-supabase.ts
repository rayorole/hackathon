import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/web/.env.local",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { count, error, data } = await db
  .from("straatbeeld_cases")
  .select("id", { count: "exact", head: false });
if (error)
  throw new Error(`Supabase check failed (${error.code}): ${error.message}`);
if (!Array.isArray(data) || count === null)
  throw new Error("Supabase returned an invalid table response.");
console.log(`Supabase connected; straatbeeld_cases contains ${count} rows.`);
