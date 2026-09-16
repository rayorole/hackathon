import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export function validateSourceUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !host.includes('.') && !host.includes(':') || host.endsWith('.local') || host.endsWith('.localhost') ||
      ipaddr.isValid(host) && !isPublicAddress(host)) throw new Error('Ongeldige publieke bron');
  url.hash = '';
  return url;
}

export function extractPage(url: string, html: string, now = new Date()) {
  const $ = load(html);
  const title = $('title').first().text().trim().slice(0, 200) || new URL(url).hostname;
  $('script, style, noscript, svg, iframe, template').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 18_000);
  return { id: randomUUID(), url, title, text, observedAt: now.toISOString().slice(0, 10),
    retrievedAt: now.toISOString(), hash: createHash('sha256').update(text).digest('hex') };
}

/** DNS addresses are checked, then pinned to the actual connection to prevent rebinding. */
export async function fetchSource(value: string, signal: AbortSignal, redirects = 0): Promise<ReturnType<typeof extractPage>> {
  if (redirects > 3) throw new Error('Te veel doorverwijzingen');
  const url = validateSourceUrl(value);
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Geen publieke bron');
  const pinned = addresses[0]!;
  const response = await new Promise<{ html: string; redirect?: string }>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      agent: false, signal, timeout: 10_000,
      headers: { 'User-Agent': 'KBO-Evidence-Desk/1.0', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, res => {
      const status = res.statusCode ?? 500;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume(); resolve({ html: '', redirect: new URL(res.headers.location, url).href }); return;
      }
      if (status !== 200 || !/text\/(html|plain)/i.test(res.headers['content-type'] ?? '')) {
        res.resume(); reject(new Error('Bron niet beschikbaar als tekst')); return;
      }
      const chunks: Buffer[] = []; let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 1_000_000) request.destroy(new Error('Bron te groot'));
        else chunks.push(chunk);
      });
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Bron reageert niet')));
    request.on('error', reject); request.end();
  });
  if (response.redirect) return fetchSource(response.redirect, signal, redirects + 1);
  return extractPage(url.href, response.html);
}
