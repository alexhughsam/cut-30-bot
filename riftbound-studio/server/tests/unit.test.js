import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, extractVideoId, outlierScore } from '../youtube.js';
import { classifyPillar } from '../pillars.js';
import { analyzeWithRules } from '../analyze.js';

test('parseDuration handles ISO8601', () => {
  assert.equal(parseDuration('PT58S'), 58);
  assert.equal(parseDuration('PT1M30S'), 90);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('garbage'), null);
});

test('extractVideoId handles URL shapes', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://tiktok.com/@x/video/123'), null);
});

test('outlierScore', () => {
  assert.equal(outlierScore(50000, 10000), 5);
  assert.equal(outlierScore(null, 10000), null);
  assert.equal(outlierScore(100, 0), null);
  assert.equal(outlierScore(100, null), null);
});

test('classifyPillar', () => {
  assert.equal(classifyPillar('Is the new Riftbound set worth buying sealed? Box prices explained').pillar, 'market');
  assert.equal(classifyPillar('Top 8 decklist breakdown from the Riftbound tournament meta').pillar, 'competitive');
  assert.equal(classifyPillar('POV: every Riftbound player when they topdeck').pillar, 'skit');
  assert.equal(classifyPillar('a video about nothing in particular').pillar, 'other');
});

test('rule-based analysis quotes the real opening line', () => {
  const transcript = 'Did you know this Riftbound card just tripled in price? Here is why. The set sold out everywhere and supply is gone. Buy singles not boxes. Follow for more.';
  const { analysis, source } = analyzeWithRules({ transcript, durationSeconds: 30 });
  assert.equal(source, 'rules');
  assert.ok(transcript.startsWith(analysis.hook_quote.split(' ').slice(0, 3).join(' ')));
  assert.equal(analysis.hook_type, 'question');
  assert.ok(analysis.why_it_works.some((w) => w.includes('question')));
  assert.ok(analysis.why_it_works.some((w) => w.includes('words/min')));
});
