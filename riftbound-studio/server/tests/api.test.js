// Full API round-trip against a real server process with a temp database:
// import → analyze → vault → script → generate → my videos → export, plus a
// restart to prove persistence, plus the validation/honesty edge cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, '..', 'index.js');
const PORT = 4900 + Math.floor(process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = mkdtempSync(path.join(tmpdir(), 'riftbound-test-'));

let proc = null;

function startServer() {
  return new Promise((resolve, reject) => {
    proc = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(PORT), RIFTBOUND_DATA_DIR: dataDir, YOUTUBE_API_KEY: '', ANTHROPIC_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const onData = (d) => { out += d; if (out.includes('running at')) resolve(); };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', (d) => { out += d; });
    proc.on('exit', (code) => reject(new Error(`server exited early (${code}): ${out}`)));
    setTimeout(() => reject(new Error(`server did not start: ${out}`)), 8000).unref();
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!proc) return resolve();
    proc.removeAllListeners('exit');
    proc.on('exit', resolve);
    proc.kill();
  });
}

async function api(pathname, opts = {}) {
  const res = await fetch(BASE + pathname, {
    headers: { 'content-type': 'application/json' },
    ...opts,
    body: opts.body != null ? JSON.stringify(opts.body) : opts.rawBody,
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  return { status: res.status, data };
}

const TRANSCRIPT = 'Stop buying Riftbound booster boxes right now. I checked prices at three stores and every box doubled since Friday. Here is the math. A box costs 180 and singles average 95. You are paying for hype. Wait for the reprint. Follow for daily market checks.';

test('full API round-trip with restart persistence', async (t) => {
  await startServer();
  t.after(async () => { await stopServer(); rmSync(dataDir, { recursive: true, force: true }); });

  // status: keyless mode is stated honestly
  let r = await api('/api/status');
  assert.equal(r.status, 200);
  assert.equal(r.data.integrations.youtube.configured, false);
  assert.match(r.data.integrations.youtube.note, /manual import/i);

  // live search fails honestly
  r = await api('/api/research/search');
  assert.equal(r.status, 424);
  assert.match(r.data.error, /YouTube Data API key/);

  // manual import with stats + baseline + transcript
  r = await api('/api/videos/import', {
    method: 'POST',
    body: {
      url: 'https://www.youtube.com/shorts/abc123XYZ_-',
      title: 'Is Riftbound sealed worth buying? Box prices are insane',
      channel_title: 'Test Channel', views: 250000, duration_seconds: 45,
      channel_baseline_views: 20000, transcript: TRANSCRIPT,
    },
  });
  assert.equal(r.status, 200);
  const videoId = r.data.id;
  assert.equal(r.data.stats_source, 'manual');
  assert.ok(r.data.stats_fetched_at);
  assert.equal(r.data.outlier_score, 12.5);
  assert.equal(r.data.pillar, 'market');

  // analyze (rule-based) quotes the real opening line
  r = await api(`/api/videos/${videoId}/analyze`, { method: 'POST' });
  assert.equal(r.status, 200);
  assert.equal(r.data.analysis_source, 'rules');
  const analysis = JSON.parse(r.data.analysis_json);
  assert.ok(TRANSCRIPT.startsWith(analysis.hook_quote.split(' ').slice(0, 4).join(' ')));

  // vault
  r = await api('/api/vault', {
    method: 'POST',
    body: { name: 'Stop-buying hook', kind: 'hook', content: 'Stop buying [product] right now — here is the math', source_video_id: videoId },
  });
  assert.equal(r.status, 200);
  const vaultId = r.data.id;

  // script + generate (template mode, opening traces to the vault entry)
  r = await api('/api/scripts', { method: 'POST', body: { title: 'Is the new set worth buying sealed?', idea: 'sealed worth it?', pillar: 'market' } });
  const scriptId = r.data.id;
  r = await api(`/api/scripts/${scriptId}/generate`, { method: 'POST', body: { vault_entry_ids: [vaultId], research_video_ids: [videoId] } });
  assert.equal(r.status, 200);
  assert.equal(r.data.generation_source, 'template');
  assert.match(r.data.content, new RegExp(`vault #${vaultId}`));

  // my videos: baseline + script linkage
  await api('/api/myvideos', { method: 'POST', body: { title: 'My verdict', views: 4200, pillar: 'market', script_id: scriptId, vault_entry_ids: [vaultId] } });
  await api('/api/myvideos', { method: 'POST', body: { title: 'Deck tech', views: 1100, pillar: 'competitive' } });
  r = await api('/api/myvideos');
  assert.equal(r.data.summary.count, 2);
  assert.equal(r.data.summary.baseline_views, 2650);
  const linked = r.data.videos.find((m) => m.script_id === scriptId);
  assert.equal(linked.script_title, 'Is the new set worth buying sealed?');

  // vault performance attribution
  r = await api('/api/vault');
  assert.equal(r.data[0].used_in, 1);

  // ---- validation & honesty edge cases ----
  r = await api('/api/videos/import', { method: 'POST', body: { title: 'x', views: 'abc' } });
  assert.equal(r.status, 400, 'non-numeric views must be rejected');
  r = await api('/api/videos/import', { method: 'POST', body: { title: 'x', views: -500, channel_baseline_views: 100 } });
  assert.equal(r.status, 400, 'negative views must be rejected');
  r = await api('/api/videos/import', { method: 'POST', body: { views: 10 } });
  assert.equal(r.status, 400, 'import without title must be rejected');
  r = await api(`/api/videos/${videoId}/transcript`, { method: 'POST', body: { transcript: '  ' } });
  assert.equal(r.status, 400, 'empty transcript must be rejected');
  r = await api('/api/videos/import', { method: 'POST', rawBody: '{broken', headers: { 'content-type': 'application/json' } });
  assert.equal(r.status, 400, 'malformed JSON must be 400');
  assert.ok(r.data.error, 'malformed JSON error must be JSON, not HTML');
  r = await api('/api/videos/9999', { method: 'DELETE' });
  assert.equal(r.status, 404, 'deleting a missing row must 404');
  r = await api('/api/videos/save', { method: 'POST', body: { title: 'spoofed', views: 1, stats_source: 'youtube_api' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.stats_source, 'manual', 'client-claimed youtube_api provenance must be downgraded without a key');
  r = await api('/api/videos/save', { method: 'POST', body: { title: 'bad source', stats_source: 'made_up' } });
  assert.equal(r.status, 400, 'unknown stats_source must be rejected');
  // analyze with a too-short transcript → 400 not 500
  const shortVid = await api('/api/videos/import', { method: 'POST', body: { title: 'short transcript vid', transcript: 'hi' } });
  r = await api(`/api/videos/${shortVid.data.id}/analyze`, { method: 'POST' });
  assert.equal(r.status, 400, 'too-short transcript should be a 400');

  // ---- restart persistence ----
  await stopServer();
  await startServer();
  r = await api('/api/export');
  assert.equal(r.status, 200);
  assert.ok(r.data.videos.length >= 2);
  assert.equal(r.data.vault_entries.length, 1);
  assert.equal(r.data.scripts.length, 1);
  assert.equal(r.data.my_videos.length, 2);
  const v = r.data.videos.find((x) => x.id === videoId);
  assert.equal(v.transcript, TRANSCRIPT);
  assert.ok(v.analysis_json, 'analysis survives restart');
});
