// Isolated visual/interaction check. Synthetic records only; no auth bypass or database writes.
// Run: node scripts/map-browser-check.mjs, then open http://localhost:3013.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = await mkdtemp(path.join(tmpdir(), "kbo-map-check-"));
const cssPath = path.join(root, "apps/web/src/app/globals.css");
const css = await postcss([tailwind({ base: path.join(root, "apps/web") })]).process(await readFile(cssPath, "utf8"), { from: cssPath });
await build({
  absWorkingDir: root, outdir: out, bundle: true, format: "esm", splitting: true, platform: "browser", jsx: "automatic",
  alias: { "@": path.join(root, "apps/web/src") },
  define: { "process.env.NODE_ENV": '"development"' },
  stdin: { resolveDir: root, loader: "tsx", contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapWorkspace } from './apps/web/src/components/evidence-map';
const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
const entries = Array.from({length: 32}, (_, i) => ({
 record: { ondernemingsnr: '000000' + String(i).padStart(4,'0'), kind: i % 3 ? 'vestiging' : 'onderneming', naam: 'Testrecord ' + i, commercieleNaam: null,
 straat: 'Teststraat', huisnr: String(i), postcode: '2900', gemeente: 'Schoten', zetelOndernemingsnr: '0012345678', zetelElders: true,
 longitude: i === 30 ? null : i === 31 ? 0 : 4.495 + (i % 5) * .001,
 latitude: i === 30 ? null : 51.251 + Math.floor(i / 5) * .001, coordinaatVerdacht: false },
 score: i % 4 === 3 ? null : { zekerheid: ['Hoog','Middel','Laag'][i % 3], voorstel: 'Synthetisch testvoorstel', redenen: [{signal:'test', uitleg:'Synthetisch testsignaal', punten:25, bron:'Testbron', bronUrl:'https://example.org', waargenomenOp:'2026-09-07'}], laatsteWaarneming: '2026-09-07' }
}));
// Include multiple records at exactly the same position.
entries[1].record.longitude = entries[0].record.longitude;
entries[1].record.latitude = entries[0].record.latitude;
client.setQueryData(['map-records'], entries);
for (const entry of entries) client.setQueryData(['map-record', entry.record.ondernemingsnr], {
 record: {...entry.record, rechtstoestand: 'Synthetische teststatus'}, score: entry.score, zetel: null,
 bewijs: [{source: 'Synthetische testbron', sourceUrl: 'https://example.org', observation: 'Alleen een testwaarneming, geen bedrijfsinformatie.', observedAt:'2026-09-07', direction:'neutraal', signal:'test'}]
});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><div className="mx-auto max-w-7xl p-4"><p className="mb-4 rounded-lg border bg-warning/10 p-3 font-semibold">LOKALE TEST — ALLE RECORDS EN LOCATIES ZIJN SYNTHETISCH</p><MapWorkspace /></div></QueryClientProvider>);
` },
});
const html = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kaart — lokale synthetische test</title><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/stdin.css"><body style="font-family:Arial,sans-serif"><div id="root"></div><script type="module" src="/stdin.js"></script></body></html>`;
createServer(async (req,res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/') { res.setHeader('Content-Type','text/html'); return res.end(html); }
  if (name === '/theme.css') { res.setHeader('Content-Type','text/css'); return res.end(css.css); }
  // Only serve the flat generated bundle directory, never workspace files.
  if (!/^\/[\w.-]+\.(js|css)$/.test(name)) { res.writeHead(404); return res.end(); }
  try { res.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(await readFile(path.join(out, name.slice(1)))); }
  catch { res.writeHead(404); res.end(); }
}).listen(3013, '127.0.0.1', () => console.log('Synthetic map check: http://127.0.0.1:3013'));
