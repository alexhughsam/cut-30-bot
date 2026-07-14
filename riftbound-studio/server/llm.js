// Claude client for analysis and script co-writing. Gated on ANTHROPIC_API_KEY;
// when absent the app says so and falls back to rule-based analysis / template
// scaffolds — it never pretends AI output happened.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.RIFTBOUND_CLAUDE_MODEL || 'claude-opus-4-8';

export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export class LLMUnavailableError extends Error {
  constructor(msg = 'Claude API key not configured. Set ANTHROPIC_API_KEY in .env to enable AI analysis and script drafting.') {
    super(msg);
    this.name = 'LLMUnavailableError';
  }
}

// Structured JSON call: schema-constrained output, parsed and returned.
export async function structured({ system, prompt, schema, maxTokens = 4000 }) {
  if (!isConfigured()) throw new LLMUnavailableError();
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined this request (safety refusal).');
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { data: JSON.parse(text), model: response.model };
}

// Free-text call (script drafting).
export async function complete({ system, prompt, maxTokens = 4000 }) {
  if (!isConfigured()) throw new LLMUnavailableError();
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined this request (safety refusal).');
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, model: response.model };
}
