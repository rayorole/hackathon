import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveryUrls } from './discovery.js';
test('discovery retains consulted URLs even when model does not emit citation annotations', () => {
  assert.deepEqual(discoveryUrls([], [{ output: { sources: [{ type: 'url', url: 'https://www.schoten.be' }] } }]), ['https://www.schoten.be']);
  assert.deepEqual(discoveryUrls([{ sourceType: 'url', url: 'https://example.com' }], [{ output: { sources: [{ type: 'url', url: 'https://example.com' }, { type: 'api' }] } }]), ['https://example.com']);
});
