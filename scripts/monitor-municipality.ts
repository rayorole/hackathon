import { createClient } from "@supabase/supabase-js";
import { setTimeout as sleep } from "node:timers/promises";
import { runMunicipalPass } from "./lib/cloud-worker";
if (new URL(process.env.SUPABASE_URL!).hostname !== "qsyxwwllwhhrwjhrfehf.supabase.co") throw new Error("Wrong project");
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {auth:{persistSession:false}});
let stopped = false;
process.on("SIGINT", () => { stopped = true; });
process.on("SIGTERM", () => { stopped = true; });
// Optional emergency runner; same shared leases and database budget as the hosted worker.
do {
  try { await runMunicipalPass(db); }
  catch (error) { console.error(error instanceof Error ? error.message : "Worker failed"); }
  if (process.argv.includes("--once")) break;
  if (!stopped) await sleep(60000);
} while (!stopped);
