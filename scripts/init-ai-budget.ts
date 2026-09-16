import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
const file = process.env.AI_BUDGET_FILE;
if (!file || !isAbsolute(file))
  throw new Error("Set AI_BUDGET_FILE to an absolute, ignored local path.");
await mkdir(dirname(file), { recursive: true });
await writeFile(
  file,
  JSON.stringify(
    { limitCents: 1000, reservedCents: 0, knownActualUsd: 0, calls: 0 },
    null,
    2,
  ) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Initialized the authorized $10 budget once. Existing ledgers are never reset.",
);
