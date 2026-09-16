import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sourceSchema } from "../packages/contracts/src/index";
import {
  collectionSchema,
  normalizeSample,
  makeCase,
  clean,
  registryId,
} from "./lib/kbo";

const args = new Set(process.argv.slice(2));
for (const arg of args)
  if (!["--write", "--parents"].includes(arg))
    throw new Error(`Unknown argument ${arg}`);
const metadata = JSON.parse(
  await readFile("data/kbo/source-metadata.json", "utf8"),
);
const bytes = await readFile("data/kbo/schoten-kbo-1000-2026-09-07.geojson");
if (
  createHash("sha256").update(bytes).digest("hex") !==
  metadata.files["schoten-kbo-1000-2026-09-07.geojson"].sha256
)
  throw new Error("Sample checksum mismatch");
const source = sourceSchema.parse({
  id: "vkbo-schoten-sample-20260907",
  url: metadata.source_url,
  publisher:
    "Digitaal Vlaanderen — publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister.",
  kind: "registry",
  retrievedAt: metadata.api_response_timestamp,
  observedAt: null,
  registrySnapshotDate: null,
  cached: true,
  isDemo: false,
});
const normalized = normalizeSample(JSON.parse(bytes.toString()), source);
const parentCache = new Map<
  string,
  { properties: Record<string, unknown>; source: typeof source }
>();
const failures: string[] = [];
if (args.has("--parents")) {
  for (const d of normalized.cases.filter(
    (d) =>
      d.establishment.address.street === "Paalstraat" &&
      !d.establishment.parent,
  )) {
    const parentId = d.establishment.parentEnterpriseId!;
    if (parentCache.has(parentId) || failures.includes(parentId)) continue;
    const url = new URL(
      "https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items",
    );
    url.search = new URLSearchParams({
      f: "application/json",
      limit: "2",
      filter: `Ondernemingsnr='${registryId(parentId)}'`,
      "filter-lang": "cql2-text",
    }).toString();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("Registry unavailable");
      const json = await r.json(),
        parsed = collectionSchema.parse(json);
      if (
        parsed.features.length !== 1 ||
        registryId(parsed.features[0].properties.Ondernemingsnr) !== parentId ||
        clean(parsed.features[0].properties.Ondernemingsnr_maatsch_zetel)
      )
        throw new Error("No unique parent result");
      const parentSource = sourceSchema.parse({
        ...source,
        id: `vkbo-parent-${parentId}-${new Date().toISOString()}`,
        url: url.href,
        retrievedAt: new Date().toISOString(),
        cached: false,
      });
      parentCache.set(parentId, {
        properties: parsed.features[0].properties,
        source: parentSource,
      });
      await mkdir("data/derived/parents", { recursive: true });
      await writeFile(
        `data/derived/parents/${parentId}.json`,
        JSON.stringify({ source: parentSource, response: json }, null, 2) +
          "\n",
      );
    } catch {
      failures.push(parentId);
    }
  }
}
const cases = normalized.cases.map((d) => {
  const parent = parentCache.get(d.establishment.parentEnterpriseId!);
  return parent
    ? makeCase(normalized.properties.get(d.establishment.id)!, source, parent)
    : d;
});
const report = {
  sourceRows: normalized.properties.size,
  enterprises: normalized.enterpriseCount,
  establishments: cases.length,
  sampleParentLinks: normalized.cases.filter((d) => d.establishment.parent)
    .length,
  liveParents: parentCache.size,
  failedParentLookups: failures,
  paalstraat: cases.filter(
    (d) => d.establishment.address.street === "Paalstraat",
  ).length,
  mode: args.has("--write") ? "write" : "dry-run",
};
console.log(JSON.stringify(report, null, 2));
if (args.has("--write")) {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (
    !url ||
    !key ||
    new URL(url).hostname !== "qsyxwwllwhhrwjhrfehf.supabase.co"
  )
    throw new Error("Expected dedicated hackathon Supabase target");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let inserted = 0;
  for (let offset = 0; offset < cases.length; offset += 100) {
    const rows = cases
      .slice(offset, offset + 100)
      .map((detail) => ({
        id: detail.establishment.id,
        municipality: detail.establishment.address.municipality,
        street: detail.establishment.address.street,
        version: 0,
        detail,
      }));
    const { data, error } = await db
      .from("straatbeeld_cases")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error)
      throw new Error(`Import failed (${error.code}): ${error.message}`);
    inserted += data.length;
  }
  console.log(
    JSON.stringify({ inserted, existingPreserved: cases.length - inserted }),
  );
}
