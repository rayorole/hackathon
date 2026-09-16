import { mkdir, readFile, writeFile, rename, rmdir } from "node:fs/promises";
import { z } from "zod";
export const budgetSchema = z.object({
  limitCents: z.literal(1000),
  reservedCents: z.number().int().min(0).max(1000),
  knownActualUsd: z.number().nonnegative(),
  calls: z.number().int().nonnegative(),
});
// Fixed model, <=100KB request and <=2000 output tokens cost under $0.10.
// Reservations are never refunded, including failed/uncertain calls. No auto-reset.
export async function budgeted<T>(
  file: string,
  call: () => Promise<{ value: T; actualUsd: number }>,
): Promise<T> {
  const lock = file + ".lock";
  try {
    await mkdir(lock);
  } catch {
    throw new Error("AI budget is locked or unavailable. No request sent.");
  }
  try {
    const ledger = budgetSchema.parse(JSON.parse(await readFile(file, "utf8")));
    if (ledger.reservedCents + 10 > ledger.limitCents)
      throw new Error("AI budget limit reached. No request sent.");
    const save = async () => {
      await writeFile(file + ".tmp", JSON.stringify(ledger, null, 2) + "\n", {
        mode: 0o600,
      });
      await rename(file + ".tmp", file);
    };
    ledger.reservedCents += 10;
    ledger.calls++;
    await save();
    const result = await call();
    if (!Number.isFinite(result.actualUsd) || result.actualUsd < 0)
      throw new Error("Invalid AI usage accounting; reservation retained.");
    ledger.knownActualUsd += result.actualUsd;
    if (result.actualUsd > 0.1) ledger.reservedCents = 1000;
    await save();
    return result.value;
  } finally {
    await rmdir(lock);
  }
}
