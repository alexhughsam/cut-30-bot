// Hook/format analysis. Two engines, both falsifiable:
//  - Claude (when ANTHROPIC_API_KEY is set): prompted to quote the actual
//    opening words and tie every claim to transcript evidence.
//  - Rules (always available): deterministic checks computed directly from the
//    transcript text — quoted hook, measurable properties, no vibes.
// Every analysis records which engine produced it.
import { structured, isConfigured as llmConfigured, LLMUnavailableError } from './llm.js';

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hook_quote', 'hook_type', 'format', 'structure', 'why_it_works', 'reusable_template'],
  properties: {
    hook_quote: { type: 'string', description: 'The exact opening words, quoted verbatim from the transcript. Do not paraphrase.' },
    hook_type: { type: 'string', description: 'Short label, e.g. "question", "bold claim", "number/stat", "negative warning", "story open"' },
    format: { type: 'string', description: 'Video format, e.g. "market breakdown", "ranked list", "deck guide", "reaction", "box opening"' },
    structure: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['beat', 'evidence'],
        properties: {
          beat: { type: 'string', description: 'Narrative beat, e.g. "hook", "stakes", "payoff", "CTA"' },
          evidence: { type: 'string', description: 'Verbatim quote from the transcript showing this beat' },
        },
      },
    },
    why_it_works: {
      type: 'array',
      items: { type: 'string' },
      description: 'Falsifiable claims tied to the transcript. Each must reference something checkable (a quote, a count, a concrete technique). Generic praise is banned.',
    },
    reusable_template: { type: 'string', description: 'The hook rewritten as a fill-in-the-blank template, e.g. "I just found out [card] is worth [price] — here\'s why"' },
  },
};

export async function analyzeWithClaude({ title, transcript, pillar, durationSeconds }) {
  const system = `You analyze short-form TCG (trading card game) videos for a creator studying what works.
Hard rules:
- Quote the ACTUAL opening words for hook_quote — verbatim from the transcript, not paraphrased.
- Every item in why_it_works must be checkable against the transcript (quote it, count it, or name the concrete technique and where it appears). "Great energy" or "strong hook" style claims are banned.
- If the transcript is too short or garbled to analyze honestly, say so in why_it_works rather than inventing detail.`;
  const prompt = `Video title: ${title || '(unknown)'}
Pillar: ${pillar || 'unknown'}
Duration: ${durationSeconds ? `${durationSeconds}s` : 'unknown'}
Transcript:
"""
${transcript.slice(0, 12000)}
"""
Produce the hook/format breakdown.`;
  const { data, model } = await structured({ system, prompt, schema: ANALYSIS_SCHEMA, maxTokens: 3000 });
  return { analysis: data, source: `claude:${model}` };
}

// Deterministic fallback. Everything here is computed from the text itself.
export function analyzeWithRules({ transcript, durationSeconds }) {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0] || clean.slice(0, 120);
  const hookQuote = firstSentence.split(' ').slice(0, 25).join(' ');

  const checks = [];
  if (/\?/.test(firstSentence)) checks.push(`Opens with a question: "${firstSentence}"`);
  if (/\d/.test(hookQuote)) checks.push(`Opening line contains a specific number: "${hookQuote}"`);
  if (/\byou\b|\byour\b/i.test(hookQuote)) checks.push('Opening line addresses the viewer directly ("you").');
  if (/\b(stop|don't|never|worst|mistake|wrong|scam|warning)\b/i.test(hookQuote)) checks.push('Opening line uses a negative/warning frame.');
  if (/\b(secret|nobody|no one|hidden|they don't want)\b/i.test(hookQuote)) checks.push('Opening line uses a curiosity-gap frame.');
  if (durationSeconds && words.length) {
    const wpm = Math.round(words.length / (durationSeconds / 60));
    checks.push(`Pace: ~${wpm} words/min over ${durationSeconds}s (${words.length} transcript words).`);
  }
  if (!checks.length) checks.push('No standard hook patterns (question, number, direct address, negativity, curiosity gap) detected in the opening line.');

  let hookType = 'statement';
  if (/\?/.test(firstSentence)) hookType = 'question';
  else if (/\d/.test(hookQuote)) hookType = 'number/stat';
  else if (/\b(stop|don't|never|worst|mistake|warning)\b/i.test(hookQuote)) hookType = 'negative warning';

  const third = Math.floor(words.length / 3);
  return {
    analysis: {
      hook_quote: hookQuote,
      hook_type: hookType,
      format: 'undetermined (rule-based analysis cannot infer format; enable Claude for this)',
      structure: [
        { beat: 'opening (first third)', evidence: words.slice(0, Math.min(30, third)).join(' ') },
        { beat: 'middle', evidence: words.slice(third, third + Math.min(30, third)).join(' ') },
        { beat: 'ending (last third)', evidence: words.slice(Math.max(0, words.length - 30)).join(' ') },
      ],
      why_it_works: checks,
      reusable_template: hookQuote,
    },
    source: 'rules',
  };
}

export async function analyzeTranscript(input) {
  if (!input.transcript || input.transcript.trim().length < 20) {
    const err = new Error('Transcript is missing or too short to analyze. Fetch or paste a transcript first.');
    err.status = 400;
    throw err;
  }
  if (llmConfigured()) {
    try {
      return await analyzeWithClaude(input);
    } catch (err) {
      if (!(err instanceof LLMUnavailableError)) {
        // Real API failure: fall back but tell the truth about it.
        const fallback = analyzeWithRules(input);
        fallback.analysis.why_it_works.unshift(`(Claude analysis failed: ${err.message} — showing rule-based analysis instead.)`);
        return fallback;
      }
      return analyzeWithRules(input);
    }
  }
  return analyzeWithRules(input);
}
