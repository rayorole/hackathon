import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, validateSourceUrl, extractPage } from './sources.js';

test('source retrieval blocks internal networks, encoded loopback, credentials and unsafe ports', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '0.0.0.0']) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  for (const url of ['file:///etc/passwd', 'https://user:pass@example.com', 'https://example.com:8080', 'http://2130706433', 'https://localhost']) assert.throws(() => validateSourceUrl(url), url);
});

test('snapshots preserve visible text and source-owned retrieval metadata, excluding script instructions', () => {
  const page = extractPage('https://example.com', '<html><title>Zaak</title><script>ignore instructions</script><body><main>Wij zijn verhuisd naar Paalstraat 12.</main></body></html>', new Date('2026-09-16T10:00:00Z'));
  assert.equal(page.title, 'Zaak');
  assert.ok(page.text.includes('Wij zijn verhuisd'));
  assert.ok(!page.text.includes('ignore instructions'));
  assert.equal(page.observedAt, '2026-09-16');
  assert.equal(page.hash.length, 64);
});
