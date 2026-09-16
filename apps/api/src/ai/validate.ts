import { ResearchExtraction, SourceSnapshot, validateResearch, type RecordKind } from '@kbo/core';

/** Fail closed per claim: one unverified model quotation must not erase other verified passages. */
export function finalizeResearch(extraction: unknown, sourceInput: unknown, kind: RecordKind) {
  const parsed = ResearchExtraction.parse(extraction);
  const sources = SourceSnapshot.array().parse(sourceInput);
  const findings = parsed.findings.filter(finding => {
    try {
      validateResearch({ ...parsed, findings: [finding], proposal: { kind: 'nazicht', reason: 'Broncontrole', field: null, value: null, sourceIds: [] } }, sources, kind);
      return true;
    } catch { return false; }
  });
  const removed = parsed.findings.length - findings.length;
  const needsReview = removed > 0 || findings.length === 0;
  return validateResearch({ ...parsed, findings,
    summary: needsReview ? (findings.length ? `${findings.length} controleerbare bronwaarnemingen gevonden. Controleer de passages; een deel van de AI-analyse kon niet worden onderbouwd.` : 'Geen controleerbare waarnemingen gevonden. De lokale activiteit blijft onbekend.') : parsed.summary,
    uncertainties: [...parsed.uncertainties, ...(removed ? [`${removed} AI-waarnemingen uitgesloten: het bronfragment of de bronverwijzing kon niet worden geverifieerd.`] : [])],
    proposal: needsReview ? { kind: 'nazicht', reason: 'De analyse is onvolledig onderbouwd. Controleer de oorspronkelijke bronnen.', field: null, value: null, sourceIds: [] } : parsed.proposal,
  }, sources, kind);
}
