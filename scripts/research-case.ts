import { createClient } from "@supabase/supabase-js";
import { detailSchema } from "../packages/contracts/src/index";
import { cloudBudget } from "./lib/cloud-budget";
import { research } from "./lib/research";
const id = process.argv[2];
if (!id || !/^\d{10}$/.test(id))
  throw new Error("Provide a registry establishment ID");
if (
  new URL(process.env.SUPABASE_URL!).hostname !==
  "qsyxwwllwhhrwjhrfehf.supabase.co"
)
  throw new Error("Wrong project");
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
const { data, error } = await db
  .from("straatbeeld_cases")
  .select("detail,version")
  .eq("id", id)
  .single();
if (error) throw error;
const result = await research(detailSchema.parse(data.detail), undefined, undefined, cloudBudget(db));
if (result.refreshed) {
  const update = await db
    .from("straatbeeld_cases")
    .update({
      detail: result.detail,
      version: data.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("version", data.version)
    .select("id");
  if (update.error || !update.data?.length)
    throw new Error(
      "Concurrent change: evidence not saved; retry from current case.",
    );
}
console.log(
  JSON.stringify(
    {
      id,
      refreshed: result.refreshed,
      message: result.messageNl,
      sources: result.detail.sources.length,
      proposals: result.detail.establishment.proposals.length,
    },
    null,
    2,
  ),
);
