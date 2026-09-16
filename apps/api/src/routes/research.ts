import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { streamText, createUIMessageStreamResponse, toUIMessageStream, type LanguageModel } from 'ai';
import { bodyLimit } from 'hono/body-limit';
import { BusinessRecord, ResearchResult, scoreRecord } from '@kbo/core';
import { db as defaultDatabase } from '../db/client.js';
import { acceptedCorrections, audit, evidence, records, researchRuns, scores } from '../db/schema.js';
import type { AuthEnv } from '../auth/middleware.js';
import { investigate } from '../ai/research.js';
import { evidenceInstructions, modelId, modelOptions, promptVersion, researchModel } from '../ai/provider.js';

export function createResearchRoutes(db = defaultDatabase, researcher = investigate, modelFactory: () => LanguageModel = researchModel) {
const researchRoutes = new Hono<AuthEnv>();
researchRoutes.use('*', bodyLimit({ maxSize: 100_000, onError: c => c.json({ error: 'Aanvraag te groot' }, 413) }));
const chatWindows = new Map<string, { started: number; count: number }>();
const modelConfigured = () => Boolean(process.env.OPENAI_API_KEY?.startsWith('sk-'));
const latest = async (nr: string) => (await db.select().from(researchRuns).where(eq(researchRuns.ondernemingsnr, nr)).orderBy(desc(researchRuns.createdAt)).limit(1))[0] ?? null;
const publicRun = (run: typeof researchRuns.$inferSelect | null) => run ? {
  id: run.id, ondernemingsnr: run.ondernemingsnr, status: run.status, model: run.model,
  result: run.result, error: run.error, createdAt: run.createdAt.toISOString(), decision: run.decision,
} : null;
async function expireRuns() {
  await db.update(researchRuns).set({ status: 'failed', error: 'Onderzoek onderbroken. Probeer opnieuw.', completedAt: new Date() })
    .where(and(eq(researchRuns.status, 'running'), sql`${researchRuns.createdAt} < now() - interval '3 minutes'`));
}

researchRoutes.get('/:nr/research', async c => {
  await expireRuns();
  return c.json({ run: publicRun(await latest(c.req.param('nr'))) });
});

researchRoutes.post('/:nr/research', async c => {
  if (!modelConfigured()) return c.json({ error: 'AI is nog niet geconfigureerd. Stel de API-sleutel op de server in.' }, 503);
  const parsed = z.object({ refresh: z.boolean().default(false) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Ongeldige onderzoeksaanvraag' }, 400);
  const nr = c.req.param('nr');
  const [record] = await db.select().from(records).where(eq(records.ondernemingsnr, nr));
  if (!record) return c.json({ error: 'Record niet gevonden' }, 404);
  await expireRuns();
  const previous = await latest(nr);
  if (previous?.status === 'running' || (!parsed.data.refresh && previous?.status === 'completed' && Date.now() - previous.createdAt.getTime() < 86400_000)) {
    return c.json({ run: publicRun(previous) });
  }
  const [budget] = await db.select({ count: sql<number>`count(*)::integer` }).from(researchRuns)
    .where(and(eq(researchRuns.officerId, c.get('officerId')), sql`${researchRuns.createdAt} > now() - interval '1 hour'`));
  if ((budget?.count ?? 0) >= 20) return c.json({ error: 'Onderzoekslimiet bereikt. Probeer over een uur opnieuw.' }, 429);
  const id = randomUUID();
  try {
    // Same record lock is used for decisions: starting research invalidates an older proposal atomically.
    await db.transaction(async tx => {
      await tx.select().from(records).where(eq(records.ondernemingsnr, nr)).for('update');
      await tx.insert(researchRuns).values({ id, ondernemingsnr: nr, officerId: c.get('officerId'), status: 'running', model: modelId, promptVersion });
    });
  } catch (error) {
    if ((error as { cause?: { code?: string }; code?: string }).cause?.code === '23505' || (error as { code?: string }).code === '23505') {
      return c.json({ error: 'Er loopt al een onderzoek. Wacht tot het klaar is.' }, 409);
    }
    throw error;
  }
  try {
    const signal = AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(120_000)]);
    const { result, usage } = await researcher(BusinessRecord.parse(record), signal);
    await db.update(researchRuns).set({ result, usage, status: 'completed', completedAt: new Date() }).where(and(eq(researchRuns.id, id), eq(researchRuns.status, 'running')));
  } catch {
    await db.update(researchRuns).set({ status: 'failed', completedAt: new Date(), error: 'Onderzoek niet voltooid. Controleer de modeltoegang of probeer opnieuw. Er zijn geen wijzigingen aanvaard.' }).where(eq(researchRuns.id, id));
  }
  const [run] = await db.select().from(researchRuns).where(eq(researchRuns.id, id));
  return c.json({ run: publicRun(run ?? null) });
});

const DecisionBody = z.object({ beoordeling: z.enum(['bevestigd', 'afgewezen']), value: z.string().trim().min(1).max(500).nullable().optional(), idempotencyKey: z.string().uuid() });
researchRoutes.post('/:nr/research/:runId/decision', async c => {
  const parsed = DecisionBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Ongeldige beslissing' }, 400);
  const nr = c.req.param('nr');
  const outcome = await db.transaction(async tx => {
    const [rawRecord] = await tx.select().from(records).where(eq(records.ondernemingsnr, nr)).for('update');
    if (!rawRecord) return { error: 'Record niet gevonden', status: 404 as const };
    const [run] = await tx.select().from(researchRuns).where(and(eq(researchRuns.id, c.req.param('runId')), eq(researchRuns.ondernemingsnr, nr))).for('update');
    if (!run) return { error: 'Onderzoek niet gevonden', status: 404 as const };
    if (run.decision) {
      if (run.decision.idempotencyKey === parsed.data.idempotencyKey && run.decision.medewerker === c.get('officerId')) return { run };
      return { error: 'Dit voorstel is al beoordeeld. Start een nieuw onderzoek voor een nieuwe beslissing.', status: 409 as const };
    }
    const [newest] = await tx.select({ id: researchRuns.id }).from(researchRuns).where(eq(researchRuns.ondernemingsnr, nr)).orderBy(desc(researchRuns.createdAt)).limit(1);
    if (newest?.id !== run.id || run.status !== 'completed' || !run.result) return { error: 'Het bewijs is gewijzigd of onvolledig. Open het nieuwste onderzoek.', status: 409 as const };
    const result = ResearchResult.parse(run.result);
    const value = parsed.data.value === undefined ? result.proposal.value : parsed.data.value;
    if (parsed.data.beoordeling === 'bevestigd' && result.proposal.kind === 'correctie' && (!value || !result.proposal.field)) return { error: 'Een correctie heeft een waarde nodig.', status: 400 as const };
    const decision = { beoordeling: parsed.data.beoordeling, value, medewerker: c.get('officerId'), beslistOp: new Date().toISOString(), idempotencyKey: parsed.data.idempotencyKey };
    const snapshot = result.findings.map(f => ({ ...f, runId: run.id }));
    await tx.insert(audit).values({ id: randomUUID(), ondernemingsnr: nr, beoordeling: decision.beoordeling, medewerker: decision.medewerker, bewijsSnapshot: snapshot,
      proposalSnapshot: { runId: run.id, proposal: result.proposal, reviewedValue: value, sources: result.sources, uncertainties: result.uncertainties }, opmerking: result.proposal.reason });
    if (decision.beoordeling === 'bevestigd') {
      if (result.proposal.kind === 'correctie' && result.proposal.field && value) {
        await tx.insert(acceptedCorrections).values({ id: randomUUID(), runId: run.id, ondernemingsnr: nr, field: result.proposal.field, value, medewerker: decision.medewerker });
      }
      // The legacy record view has no scope label: only matched findings belong there.
      // Complete scoped findings and source linkage remain in the immutable run and audit.
      for (const item of snapshot.filter(f => f.scope === rawRecord.kind)) await tx.insert(evidence).values({ ...item, id: randomUUID(), ondernemingsnr: nr });
      // Only validated local/enterprise evidence in this reviewed run contributes to the current score.
      const scoringEvidence = result.findings.filter(f => f.scope === rawRecord.kind).map(f => ({ signal: f.signal, source: f.source, sourceUrl: f.sourceUrl, observation: f.observation, observedAt: f.observedAt, direction: f.direction }));
      const score = scoreRecord(BusinessRecord.parse(rawRecord), scoringEvidence);
      await tx.insert(scores).values({ ondernemingsnr: nr, ...score }).onConflictDoUpdate({ target: scores.ondernemingsnr, set: { ...score, berekendOp: new Date() } });
    }
    const [updated] = await tx.update(researchRuns).set({ decision }).where(eq(researchRuns.id, run.id)).returning();
    return { run: updated! };
  });
  if ('error' in outcome) return c.json({ error: outcome.error }, outcome.status);
  return c.json({ run: publicRun(outcome.run) });
});

const MessageBody = z.object({
  runId: z.string().uuid(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), parts: z.array(z.union([
    z.object({ type: z.literal('text'), text: z.string().max(6000) }),
    z.object({ type: z.literal('step-start') }),
  ])).max(8) })).min(1).max(20),
});
researchRoutes.post('/:nr/assistant', async c => {
  if (!modelConfigured()) return c.json({ error: 'AI is nog niet geconfigureerd.' }, 503);
  const parsed = MessageBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Ongeldig bericht. Start een nieuw gesprek.' }, 400);
  const [run] = await db.select().from(researchRuns).where(and(eq(researchRuns.id, parsed.data.runId), eq(researchRuns.ondernemingsnr, c.req.param('nr'))));
  if (!run?.result || run.status !== 'completed') return c.json({ error: 'Onderzoek eerst dit record.' }, 409);
  if (parsed.data.messages.reduce((size, m) => size + m.parts.reduce((n, p) => n + (p.type === 'text' ? p.text.length : 0), 0), 0) > 24_000) {
    return c.json({ error: 'Dit gesprek is te lang. Start een nieuw gesprek.' }, 400);
  }
  const now = Date.now();
  for (const [officer, window] of chatWindows) if (now - window.started > 60_000) chatWindows.delete(officer);
  const window = chatWindows.get(c.get('officerId')) ?? { started: now, count: 0 };
  if (window.count >= 10) return c.json({ error: 'Te veel vragen. Probeer over een minuut opnieuw.' }, 429);
  window.count++; chatWindows.set(c.get('officerId'), window);
  const { sources, ...report } = ResearchResult.parse(run.result);
  const result = streamText({
    model: modelFactory(), system: `${evidenceInstructions}\nLeg alleen dit opgeslagen onderzoeksresultaat uit. Verwijs met klikbare bronlinks. Beweer nooit dat je nieuwe bronnen hebt bekeken of wijzigingen hebt uitgevoerd. Bewijs: ${JSON.stringify({ ...report, sources: sources.map(({ id, url, title, observedAt }) => ({ id, url, title, observedAt })) })}`,
    messages: parsed.data.messages.map(m => ({ role: m.role, content: m.parts.flatMap(p => p.type === 'text' ? [p.text] : []).join('\n') })),
    providerOptions: modelOptions, maxOutputTokens: 2200, maxRetries: 1,
    abortSignal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(60_000)]),
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, sendReasoning: false, onError: () => 'Het antwoord kon niet worden voltooid. Probeer opnieuw.' }) });
});
return researchRoutes;
}
export const researchRoutes = createResearchRoutes();
