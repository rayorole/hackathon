/** Small, explicit provider capability check. Does not create business records or decisions. */
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ResearchExtraction } from '@kbo/core';
import { modelId, modelOptions, researchModel } from '../ai/provider.js';
import { discoveryUrls } from '../ai/discovery.js';

try {
  const search = await generateText({ model: researchModel(), tools: { web_search: openai.tools.webSearch({ searchContextSize: 'low' }) },
    toolChoice: 'required', prompt: 'Vind de officiële website van gemeente Schoten in België. Geef alleen de bronlink. Dit is een technische verbindingstest, geen bedrijfsonderzoek.',
    providerOptions: { openai: { ...modelOptions.openai, maxToolCalls: 1 } }, maxRetries: 0, maxOutputTokens: 1500, abortSignal: AbortSignal.timeout(60_000) });
  const structured = await generateText({ model: researchModel(), output: Output.object({ schema: ResearchExtraction }),
    prompt: 'Technische test zonder bedrijfsgegevens of bronnen. Geef in het Nederlands een leeg onderzoeksresultaat: geen findings, geen bronnen, activiteit onbekend, voorstel nazicht met field en value null. Verzin geen bedrijf.',
    providerOptions: modelOptions, maxRetries: 0, maxOutputTokens: 2000, abortSignal: AbortSignal.timeout(60_000) });
  const foundSources = discoveryUrls(search.sources, search.toolResults);
  if (!foundSources.length) throw new Error('Web search returned no retrievable source URLs');
  console.log(JSON.stringify({ model: modelId, searchSources: foundSources.length, structuredOutputValid: ResearchExtraction.safeParse(structured.output).success,
    usage: { search: search.totalUsage, structured: structured.totalUsage } }));
} catch (error) {
  // Provider errors can contain request headers; never serialize the raw exception.
  console.error(JSON.stringify({ ok: false, kind: error instanceof Error ? error.name : 'unknown', status: (error as { statusCode?: number }).statusCode }));
  process.exitCode = 1;
}
