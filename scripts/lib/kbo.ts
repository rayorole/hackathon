import { z } from "zod";
import { detailSchema, type Detail } from "../../packages/contracts/src/index";

export const collectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      properties: z.record(z.string(), z.unknown()),
    }),
  ),
});
export type Properties = Record<string, unknown>;
export type RegistrySource = Detail["sources"][number];
export function clean(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}
export function registryId(value: unknown): string {
  const id = clean(value);
  if (!id || !/^\d{10}$/.test(id))
    throw new Error(
      "Invalid registry identifier; identifiers must be ten-character strings.",
    );
  return id;
}
export function realDate(value: unknown): string | null {
  const s = clean(value)?.slice(0, 10);
  if (!s || ["1900-01-01", "9999-12-31"].includes(s)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const date = new Date(s + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s
    ? s
    : null;
}
function address(p: Properties): Detail["establishment"]["address"] {
  const required = (key: string) => {
    const value = clean(p[key]);
    if (!value)
      throw new Error(
        `Missing ${key} in registry record ${clean(p.Ondernemingsnr)}`,
      );
    return value;
  };
  return {
    street: required("KBO_Straat"),
    houseNumber: clean(p.KBO_Huisnr) ?? "",
    postalCode: required("KBO_Postcode"),
    municipality: required("KBO_Gemeente"),
  };
}
export function makeCase(
  p: Properties,
  source: RegistrySource,
  parent?: { properties: Properties; source: RegistrySource },
): Detail {
  const id = registryId(p.Ondernemingsnr),
    parentId = registryId(p.Ondernemingsnr_maatsch_zetel);
  if (
    parent &&
    (registryId(parent.properties.Ondernemingsnr) !== parentId ||
      clean(parent.properties.Ondernemingsnr_maatsch_zetel))
  )
    throw new Error("Parent identity mismatch");
  const name =
    clean(p.Commerciele_naam) ?? clean(p.Maatschappelijke_naam) ?? id;
  const localAddress = address(p);
  const sources = [source];
  if (parent && parent.source.id !== source.id) sources.push(parent.source);
  const evidence: Detail["evidence"] = [
    {
      id: `kbo:${id}:registration`,
      establishmentId: id,
      sourceId: source.id,
      excerpt: `VKBO-registervermelding: ${name}, ${localAddress.street} ${localAddress.houseNumber}, ${localAddress.postalCode} ${localAddress.municipality}. Dit bewijst geen actuele lokale activiteit.`,
      field: "registryRegistration",
      observedValue: id,
      scope: "local",
      assessment: "insufficient",
    },
  ];
  const facts: [string, string | null][] = [
    ["registrationDate", realDate(p.Datum_inschrijving)],
    ["startDate", realDate(p.Startdatum)],
    ["cessationDate", realDate(p.Datum_stopzetting)],
    ["address.busNumber", clean(p.KBO_Busnr)],
    ["telephone", clean(p.Telefoonnummer)],
    ["email", clean(p.Email)],
    ["naceRsz", clean(p.NACE_hoofdact_RSZ)],
    ["naceRszDescription", clean(p.Omschrijving_hoofdact_RSZ)],
  ];
  for (const [field, value] of facts)
    if (value !== null)
      evidence.push({
        id: `kbo:${id}:${field}`,
        establishmentId: id,
        sourceId: source.id,
        excerpt: `VKBO-registratie — ${field}: ${value}`,
        field,
        observedValue: value,
        scope: "local",
        assessment: "insufficient",
      });
  if (parent && clean(parent.properties.KBO_Busnr))
    evidence.push({
      id: `kbo:${id}:parentBus`,
      establishmentId: id,
      sourceId: parent.source.id,
      excerpt: `Busnummer maatschappelijke zetel: ${clean(parent.properties.KBO_Busnr)}`,
      field: "parent.registeredAddress.busNumber",
      observedValue: clean(parent.properties.KBO_Busnr),
      scope: "enterprise",
      assessment: "insufficient",
    });
  return detailSchema.parse({
    establishment: {
      id,
      name,
      address: localAddress,
      parentEnterpriseId: parentId,
      parent: parent
        ? {
            id: parentId,
            legalName:
              clean(parent.properties.Maatschappelijke_naam) ?? parentId,
            registeredAddress: address(parent.properties),
            registryStatus: clean(parent.properties.Rechtstoestand),
            sourceId: parent.source.id,
          }
        : null,
      registryStatus: clean(p.Rechtstoestand),
      sourceId: source.id,
      activityAssessment: "insufficient",
      evidenceIds: evidence.map((e) => e.id),
      proposals: [],
      isDemo: false,
    },
    sources,
    evidence,
    reviews: [],
  });
}
export function normalizeSample(input: unknown, source: RegistrySource) {
  const { features } = collectionSchema.parse(input);
  const byId = new Map<string, Properties>();
  for (const { properties: p } of features) {
    const id = registryId(p.Ondernemingsnr);
    if (byId.has(id)) throw new Error(`Duplicate registry identifier ${id}`);
    byId.set(id, p);
  }
  const cases: Detail[] = [];
  for (const p of byId.values()) {
    const parentId = clean(p.Ondernemingsnr_maatsch_zetel);
    if (!parentId) continue;
    const parent = byId.get(registryId(parentId));
    cases.push(
      makeCase(p, source, parent ? { properties: parent, source } : undefined),
    );
  }
  return {
    cases,
    properties: byId,
    enterpriseCount: features.length - cases.length,
  };
}
