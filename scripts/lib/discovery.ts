import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";
import type { Detail } from "../../packages/contracts/src/index";
export type Target = { url: string; publisher: string; discovered?: boolean; requireEnterpriseNumber?: string };
export type DirectoryEntry = Target & { name: string; address: string };
const allowed = new Set([
  "www.genietvanschoten.be",
  "www.amplifon.com",
  "www.trixxo.be",
]);
export function isPublicV4(address: string) {
 const parts=address.split('.').map(Number);
 if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
 const [a,b]=parts;
 return a!==0&&a!==10&&a!==127&&a<224&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0||b===2))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19||b===51))&&!(a===203&&b===0);
}
async function validateDiscoveredHost(u: URL) {
 if(isIP(u.hostname)||!u.hostname.includes('.')||!/[.](be|com|org|net|eu|nl|info|biz)$/i.test(u.hostname))throw new Error('Unsupported source host');
 const addresses=await lookup(u.hostname,{all:true,family:4});
 if(!addresses.length||addresses.some(x=>!isPublicV4(x.address)))throw new Error('Source resolves to a non-public address');
}
export async function publicHtml(url: string, discovered = false, redirects = 0, requestSignal = AbortSignal.timeout(15000)): Promise<string> {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.port ||
    u.username ||
    u.password ||
    (!allowed.has(u.hostname) && !discovered)
  )
    throw new Error("Source domain is not approved");
  if(discovered && !allowed.has(u.hostname)) await validateDiscoveredHost(u);
  const response = await fetch(u, {
    redirect: "manual",
    signal: requestSignal,
    headers: {
      "user-agent": "StraatbeeldHackathon/0.1 (municipal evidence prototype)",
    },
  });
  if ([301,302,303,307,308].includes(response.status)) {
    const location=response.headers.get('location');
    await response.body?.cancel();
    if(!location||redirects>=2)throw new Error('Source redirect limit reached');
    return publicHtml(new URL(location,u).href,discovered,redirects+1,requestSignal);
  }
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
