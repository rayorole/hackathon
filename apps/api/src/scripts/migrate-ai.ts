import { readFile } from 'node:fs/promises';
import { client } from '../db/client.js';

try {
  const existing = await client`select to_regclass('public.records') as records`;
  if (!existing[0]?.records) {
    const baseline = await readFile(new URL('../../drizzle/0000_baseline.sql', import.meta.url), 'utf8');
    await client.begin(async tx => { await tx.unsafe(baseline); });
  }
  const sql = await readFile(new URL('../../drizzle/0001_ai_research.sql', import.meta.url), 'utf8');
  await client.begin(async tx => { await tx.unsafe(sql); });
  console.log('AI research migration applied.');
} finally { await client.end(); }
