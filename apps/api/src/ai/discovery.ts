import { z } from 'zod';

const SearchOutput = z.object({ output: z.object({ sources: z.array(z.object({ type: z.string(), url: z.string().optional() })).optional() }) });
/** Citations are a subset; a short model answer may have no citation annotations at all. */
export function discoveryUrls(citations: Array<{ sourceType: string; url?: string }>, toolResults: unknown[]): string[] {
  const cited = citations.flatMap(source => source.sourceType === 'url' && source.url ? [source.url] : []);
  const consulted = toolResults.flatMap(result => {
    const parsed = SearchOutput.safeParse(result);
    return parsed.success ? (parsed.data.output.sources ?? []).flatMap(source => source.type === 'url' && source.url ? [source.url] : []) : [];
  });
  return [...new Set([...cited, ...consulted])].slice(0, 3);
}
