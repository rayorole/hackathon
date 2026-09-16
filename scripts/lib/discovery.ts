import { load } from "cheerio";
import type { Detail } from "../../packages/contracts/src/index";
export type Target = { url: string; publisher: string };
export type DirectoryEntry = Target & { name: string; address: string };
const allowed = new Set([
  "www.genietvanschoten.be",
  "www.amplifon.com",
  "www.trixxo.be",
]);
export async function publicHtml(url: string) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.port ||
    u.username ||
    u.password ||
    !allowed.has(u.hostname)
  )
    throw new Error("Source domain is not approved");
  const response = await fetch(u, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      "user-agent": "StraatbeeldHackathon/0.1 (municipal evidence prototype)",
    },
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html")
  )
    throw new Error("Public source unavailable");
  const reader = response.body!.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2000000) {
      await reader.cancel();
      throw new Error("Public source too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
const clean = (s: string) =>
  s
    .toLocaleLowerCase("nl-BE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function parseDirectory(html: string): DirectoryEntry[] {
  const $ = load(html),
    entries = new Map<string, DirectoryEntry>();
  $("a[href^='/handelaars/']").each((_, el) => {
    const a = $(el),
      name = a.find('[fs-cmsfilter-field="name"]').text().trim();
    const address = a.find(".div-block-41").text().trim();
    const url = new URL(a.attr("href")!, "https://www.genietvanschoten.be")
      .href;
    if (name && address)
      entries.set(url, {
        url,
        name,
        address,
        publisher: "Geniet van Schoten — lokale handelaarsgids",
      });
  });
  return [...entries.values()];
}
export function matchDirectory(
  detail: Detail,
  entries: DirectoryEntry[],
): Target[] {
  const e = detail.establishment,
    a = e.address,
    location = clean(`${a.street} ${a.houseNumber}`);
  const names = clean(e.name)
    .split(" ")
    .filter(
      (x) =>
        x.length >= 3 &&
        !["schoten", "bv", "nv", "van", "het", "een"].includes(x),
    );
  return entries
    .filter((x) => {
      const address = clean(x.address),
        name = clean(x.name).split(" ");
      return (
        address.startsWith(location + " ") &&
        address.includes(clean(a.municipality)) &&
        address.includes(a.postalCode) &&
        names.some((n) => name.includes(n))
      );
    })
    .map(({ url, publisher }) => ({ url, publisher }));
}
