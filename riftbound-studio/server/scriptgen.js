// Script drafting. Pulls evidence (vault entries, researched videos, the
// user's own performance) and drafts a 30-60s short. With Claude configured it
// writes a full draft; without it, it produces an honest template scaffold
// built from the selected vault hook — clearly labeled, never fake-AI.
import { complete, isConfigured as llmConfigured } from './llm.js';

function contextBlock({ idea, pillar, vaultEntries, researchVideos, myPerformance }) {
  const parts = [];
  parts.push(`Idea: ${idea}`);
  parts.push(`Pillar: ${pillar || 'unspecified'}`);
  if (vaultEntries?.length) {
    parts.push('Vault templates the creator wants to draw on (proven hooks/formats they saved):');
    for (const v of vaultEntries) {
      parts.push(`- [vault #${v.id}] (${v.kind}) "${v.name}": ${v.content}`);
    }
  }
  if (researchVideos?.length) {
    parts.push('Researched videos (real, with real stats where noted):');
    for (const r of researchVideos) {
      const stats = r.views != null ? `${r.views} views (source: ${r.stats_source}, fetched ${r.stats_fetched_at})` : 'no stats recorded';
      const outlier = r.outlier_score != null ? `, outlier ×${Number(r.outlier_score).toFixed(1)}` : '';
      parts.push(`- [video #${r.id}] "${r.title}" — ${stats}${outlier}${r.analysis_json ? ` — hook: ${JSON.parse(r.analysis_json).hook_quote}` : ''}`);
    }
  }
  if (myPerformance) parts.push(`Creator's own performance context: ${myPerformance}`);
  return parts.join('\n');
}

export async function draftScript(input) {
  if (llmConfigured()) {
    const system = `You are a short-form script co-writer for a TCG (trading card game) creator. Riftbound (Riot's League of Legends TCG) is the default niche.
Rules:
- Write a 30-60 second script: hook first (one punchy line), then tight beats, no fluff, spoken-word style.
- The opening MUST visibly descend from one of the provided vault templates or researched hooks — name which one in a comment line at the top like: [opening based on vault #3].
- NEVER invent card prices, market data, or stats. Where the script needs a real number the creator must supply, write [FILL: current price of X] placeholders instead.
- Format: a "HOOK:" line, then "BEATS:" as short spoken lines, optionally "[visual: ...]" cues, then "CTA:" one line.`;
    const prompt = contextBlock(input) + '\n\nWrite the script draft.';
    const { text, model } = await complete({ system, prompt, maxTokens: 2000 });
    return { content: text, source: `claude:${model}` };
  }

  // Honest scaffold: assembled from the user's own vault material.
  const v = input.vaultEntries?.[0];
  const hookLine = v ? v.content : '[Write your hook here — no vault entry selected]';
  const basis = v ? `[opening based on vault #${v.id} "${v.name}"]` : '[no vault entry selected]';
  const content = `${basis}
(Template scaffold — Claude is not configured, so this is a fill-in structure, not an AI draft. Set ANTHROPIC_API_KEY for full drafting.)

HOOK: ${hookLine}

BEATS:
- [State the core claim or question for: ${input.idea}]
- [Evidence 1 — use a real number you can source, e.g. [FILL: current sealed box price]]
- [Evidence 2 or counterpoint]
- [Your verdict in one line]

CTA: [One-line ask: follow for more Riftbound ${input.pillar || ''} breakdowns]`;
  return { content, source: 'template' };
}
