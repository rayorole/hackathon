import { createClient } from "@supabase/supabase-js";
import { createFixtures } from "../packages/contracts/src/fixtures";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing Supabase environment.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const rows = createFixtures().map((detail) => ({
  id: detail.establishment.id,
  municipality: detail.establishment.address.municipality,
  street: detail.establishment.address.street,
  version: 0,
  detail,
}));
const { error } = await db
  .from("straatbeeld_cases")
  .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
if (error) throw new Error(`Seed failed (${error.code}): ${error.message}`);
console.log(
  "Three fictional cases ensured; existing cases and reviews were not overwritten.",
);
