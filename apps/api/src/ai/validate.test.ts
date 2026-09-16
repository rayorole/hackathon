import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finalizeResearch } from './validate.js';

test('a model paraphrase is excluded without losing independently verified evidence', () => {
  const sources = [{ id: 'source', url: 'https://example.org', title: 'Testbron', text: 'Fictieve testbron. Paalstraat 12.', hash: 'test', observedAt: '2026-09-16', retrievedAt: '2026-09-16T10:00:00Z' }];
  const finding = { sourceId: 'source', quote: 'Paalstraat 12.', observation: 'Testadres.', signal: 'adres-komt-overeen', direction: 'bevestigt', scope: 'vestiging' };
  const result = finalizeResearch({ summary: 'Ongeverifieerde samenvatting', findings: [finding, { ...finding, quote: 'Dit staat nergens.' }], uncertainties: [],
    proposal: { kind: 'correctie', field: 'huisnr', value: '99', reason: 'Ongeverifieerd voorstel', sourceIds: ['source'] } }, sources, 'vestiging');
  assert.equal(result.findings.length, 1);
  assert.equal(result.proposal.kind, 'nazicht');
  assert.ok(!result.summary.includes('Ongeverifieerde'));
  assert.ok(result.uncertainties.some(text => text.includes('uitgesloten')));
});
