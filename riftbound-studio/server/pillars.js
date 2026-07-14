// Deterministic keyword classifier for content pillars. Falsifiable by design:
// classify() also returns which keywords matched, and the UI labels the result
// as a keyword guess ('pillar_source: keyword') that the user can override.
const PILLAR_KEYWORDS = {
  market: [
    'price', 'prices', 'pricing', 'invest', 'investing', 'investment', 'buy', 'buying',
    'sell', 'selling', 'worth', 'value', 'spike', 'spiked', 'spiking', 'sealed',
    'box', 'booster', 'pull rate', 'pull rates', 'chase card', 'market', 'flip',
    'profit', 'roi', 'expensive', 'cheap', 'grading', 'graded', 'psa', 'collect',
    'collector', 'reprint', 'print run', 'allocation', 'preorder', 'pre-order', 'msrp',
  ],
  competitive: [
    'deck', 'decks', 'decklist', 'meta', 'tier list', 'tierlist', 'tournament',
    'top 8', 'top8', 'ranked', 'ladder', 'matchup', 'tech', 'sideboard', 'combo',
    'strategy', 'guide', 'how to play', 'gameplay', 'best deck', 'counter',
    'mulligan', 'curve', 'aggro', 'control', 'midrange', 'champion', 'legend rank',
    'win rate', 'winrate', 'competitive', 'nationals', 'regionals', 'worlds',
  ],
  skit: [
    'skit', 'pov', 'meme', 'funny', 'parody', 'when you', 'every player',
    'types of', 'be like', 'irl', 'comedy', 'joke', 'roleplay',
  ],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word matching so 'deck' doesn't fire inside 'topdeck'.
function hasKeyword(hay, keyword) {
  return new RegExp(`\\b${escapeRe(keyword)}\\b`).test(hay);
}

export function classifyPillar(text) {
  const hay = (text || '').toLowerCase();
  let best = { pillar: 'other', matches: [] };
  for (const [pillar, words] of Object.entries(PILLAR_KEYWORDS)) {
    const matches = words.filter((w) => hasKeyword(hay, w));
    if (matches.length > best.matches.length) best = { pillar, matches };
  }
  return best; // { pillar, matches }  matches.length === 0 => 'other'
}

export const PILLARS = ['market', 'competitive', 'skit', 'other'];
