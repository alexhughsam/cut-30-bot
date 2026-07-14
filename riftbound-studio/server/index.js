import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, { DB_PATH, getSetting, setSetting, exportAll } from './db.js';
import * as yt from './youtube.js';
import { tryFetchYouTubeTranscript } from './transcripts.js';
import { analyzeTranscript } from './analyze.js';
import { draftScript } from './scriptgen.js';
import { classifyPillar, PILLARS } from './pillars.js';
import * as llm from './llm.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(here, '..', 'public')));

const PORT = process.env.PORT || 4173;

// Wrap async handlers so errors surface as JSON, not hangs.
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  const status = err.status
    || (err.name === 'LLMUnavailableError' || err.reason === 'not_configured' ? 424 : 500);
  res.status(status).json({ error: err.message });
});

const nowIso = () => new Date().toISOString();
const parseJson = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
const httpError = (status, msg) => Object.assign(new Error(msg), { status });

// Parse a user-supplied count/stat. Absent ('' / null / undefined) → null.
// Present but not a finite number ≥ 0 → 400: a garbage stat must never get a
// source label attached to it.
function parseCount(value, field, { max = null } = {}) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw httpError(400, `"${field}" must be a non-negative number (got ${JSON.stringify(value)}).`);
  if (max != null && n > max) throw httpError(400, `"${field}" must be ≤ ${max}.`);
  return n;
}

// A URL field must be a string (or absent) — anything else is a 400, not a 500.
function parseUrl(value, field = 'url') {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw httpError(400, `"${field}" must be a string.`);
  return value.trim() || null;
}

function parsePillar(value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw httpError(400, `"pillar" must be one of: ${PILLARS.join(', ')}.`);
    return null;
  }
  if (!PILLARS.includes(value)) throw httpError(400, `"pillar" must be one of: ${PILLARS.join(', ')} (got ${JSON.stringify(value)}).`);
  return value;
}

function parseIdArray(value, field) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.some((x) => !Number.isInteger(Number(x)))) {
    throw httpError(400, `"${field}" must be an array of ids.`);
  }
  return value.map(Number);
}

// ---------- status ----------
app.get('/api/status', h(async (req, res) => {
  res.json({
    niche: getSetting('niche', 'Riftbound'),
    pillars: PILLARS,
    integrations: {
      youtube: {
        configured: yt.isConfigured(),
        note: yt.isConfigured()
          ? 'YouTube Data API v3 enabled: live search, channel stats and baselines.'
          : 'No YOUTUBE_API_KEY set. Live YouTube search/stats are disabled — use manual import (paste URL + stats). Get a free key: Google Cloud Console → enable "YouTube Data API v3" → create API key → put it in .env.',
      },
      claude: {
        configured: llm.isConfigured(),
        model: llm.isConfigured() ? llm.MODEL : null,
        note: llm.isConfigured()
          ? `Claude analysis/drafting enabled (${llm.MODEL}).`
          : 'No ANTHROPIC_API_KEY set. Hook analysis falls back to deterministic rule-based checks and script drafting falls back to fill-in templates. Set the key in .env for full AI features.',
      },
      tiktok: { configured: false, note: 'TikTok has no public read API. Manual import is the supported path (paste URL, stats, transcript).' },
      instagram: { configured: false, note: 'Instagram has no public read API for Reels research. Manual import is the supported path.' },
    },
    db_path: DB_PATH,
  });
}));

app.post('/api/settings', h(async (req, res) => {
  if (req.body.niche) setSetting('niche', String(req.body.niche));
  res.json({ ok: true, niche: getSetting('niche', 'Riftbound') });
}));

// ---------- channels (watchlist) ----------
function upsertChannel(c) {
  const existing = c.external_id
    ? db.prepare('SELECT * FROM channels WHERE platform = ? AND external_id = ?').get(c.platform || 'youtube', c.external_id)
    : null;
  if (existing) {
    db.prepare(`UPDATE channels SET title = COALESCE(?, title), handle = COALESCE(?, handle), url = COALESCE(?, url),
      subscriber_count = COALESCE(?, subscriber_count), stats_source = COALESCE(?, stats_source), stats_fetched_at = COALESCE(?, stats_fetched_at),
      baseline_views = COALESCE(?, baseline_views), baseline_sample = COALESCE(?, baseline_sample),
      baseline_source = COALESCE(?, baseline_source), baseline_fetched_at = COALESCE(?, baseline_fetched_at)
      WHERE id = ?`).run(
      c.title ?? null, c.handle ?? null, c.url ?? null,
      c.subscriber_count ?? null, c.stats_source ?? null, c.stats_fetched_at ?? null,
      c.baseline_views ?? null, c.baseline_sample ?? null, c.baseline_source ?? null, c.baseline_fetched_at ?? null,
      existing.id);
    return db.prepare('SELECT * FROM channels WHERE id = ?').get(existing.id);
  }
  const info = db.prepare(`INSERT INTO channels (platform, external_id, handle, title, url, watchlisted, baseline_views, baseline_sample, baseline_source, baseline_fetched_at, subscriber_count, stats_source, stats_fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    c.platform || 'youtube', c.external_id ?? null, c.handle ?? null, c.title ?? null, c.url ?? null,
    c.watchlisted ? 1 : 0, c.baseline_views ?? null, c.baseline_sample ?? null, c.baseline_source ?? null,
    c.baseline_fetched_at ?? null, c.subscriber_count ?? null, c.stats_source ?? null, c.stats_fetched_at ?? null);
  return db.prepare('SELECT * FROM channels WHERE id = ?').get(info.lastInsertRowid);
}

app.get('/api/channels', h(async (req, res) => {
  const rows = db.prepare('SELECT * FROM channels ORDER BY watchlisted DESC, title').all();
  res.json(rows);
}));

// Add a channel to the watchlist. With the API: by channel URL/id, hydrated +
// baseline computed. Without: manual entry with a user-supplied baseline.
app.post('/api/channels/watch', h(async (req, res) => {
  const { external_id, title, url, manual_baseline_views, manual_baseline_sample, platform } = req.body;
  if (yt.isConfigured() && external_id) {
    const b = await yt.channelBaseline(external_id);
    const chan = upsertChannel({
      ...b.channel,
      baseline_views: b.baseline_views,
      baseline_sample: b.baseline_sample,
      baseline_source: 'youtube_api',
      baseline_fetched_at: b.baseline_fetched_at,
    });
    db.prepare('UPDATE channels SET watchlisted = 1 WHERE id = ?').run(chan.id);
    return res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(chan.id));
  }
  if (!title) return res.status(400).json({ error: 'Without a YouTube API key, provide at least a channel title (and optionally a manual baseline: median views of their recent videos).' });
  const chan = upsertChannel({
    platform: platform || 'youtube',
    external_id: external_id || null,
    title,
    url: url || null,
    watchlisted: 1,
    baseline_views: manual_baseline_views != null ? Number(manual_baseline_views) : null,
    baseline_sample: manual_baseline_sample != null ? Number(manual_baseline_sample) : null,
    baseline_source: manual_baseline_views != null ? 'manual' : null,
    baseline_fetched_at: manual_baseline_views != null ? nowIso() : null,
  });
  db.prepare('UPDATE channels SET watchlisted = 1 WHERE id = ?').run(chan.id);
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(chan.id));
}));

app.delete('/api/channels/:id/watch', h(async (req, res) => {
  db.prepare('UPDATE channels SET watchlisted = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

app.get('/api/channels/:id/videos', h(async (req, res) => {
  const chan = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!chan) return res.status(404).json({ error: 'Channel not found' });
  if (!chan.external_id || !yt.isConfigured()) {
    return res.status(424).json({ error: 'Live channel videos need a YouTube API key and a channel id. Saved videos for this channel appear in the Research library.' });
  }
  const data = await yt.channelRecentVideos(chan.external_id);
  upsertChannel({ ...data.channel, baseline_views: data.baseline_views, baseline_sample: data.baseline_sample, baseline_source: 'youtube_api', baseline_fetched_at: data.baseline_fetched_at });
  const videos = data.videos.map((v) => ({ ...v, outlier_score: yt.outlierScore(v.views, data.baseline_views) }));
  res.json({ channel: data.channel, baseline_views: data.baseline_views, baseline_sample: data.baseline_sample, videos });
}));

// ---------- research: live search ----------
app.get('/api/research/search', h(async (req, res) => {
  if (!yt.isConfigured()) {
    return res.status(424).json({
      error: 'Live search needs a YouTube Data API key (YOUTUBE_API_KEY in .env). Until then, import videos manually below — paste a URL and its stats.',
    });
  }
  const niche = getSetting('niche', 'Riftbound');
  const pillar = req.query.pillar && req.query.pillar !== 'all' ? String(req.query.pillar) : null;
  const pillarTerms = { market: 'card prices sealed box investing market', competitive: 'deck meta tournament guide', skit: 'skit funny meme' };
  const q = req.query.q ? String(req.query.q) : `${niche} ${pillar ? pillarTerms[pillar] || '' : 'tcg'}`.trim();
  const days = Number(req.query.days || 90);
  const publishedAfter = new Date(Date.now() - days * 86400e3).toISOString();

  const videos = await yt.searchShorts(q, { maxResults: 25, publishedAfter });
  const baselines = await yt.baselinesForChannels(videos.map((v) => v.channel_external_id));

  const results = videos.map((v) => {
    const b = baselines.get(v.channel_external_id);
    const baseline = b && !b.error ? b.baseline_views : null;
    const cls = classifyPillar(`${v.title}`);
    return {
      ...v,
      pillar_guess: cls.pillar,
      pillar_keywords: cls.matches,
      channel_baseline_views: baseline,
      channel_baseline_sample: b && !b.error ? b.baseline_sample : null,
      baseline_error: b?.error || null,
      outlier_score: yt.outlierScore(v.views, baseline),
    };
  }).sort((a, b2) => (b2.outlier_score ?? -1) - (a.outlier_score ?? -1));

  res.json({ query: q, fetched_at: nowIso(), source: 'youtube_api', results });
}));

// Save a search result (or refresh) into the library.
function upsertVideo(v) {
  const existing = v.external_id
    ? db.prepare('SELECT * FROM videos WHERE platform = ? AND external_id = ?').get(v.platform || 'youtube', v.external_id)
    : (v.url ? db.prepare('SELECT * FROM videos WHERE url = ?').get(v.url) : null);
  if (existing) {
    db.prepare(`UPDATE videos SET title = COALESCE(?, title), channel_title = COALESCE(?, channel_title),
      published_at = COALESCE(?, published_at), duration_seconds = COALESCE(?, duration_seconds),
      views = COALESCE(?, views), likes = COALESCE(?, likes), comments = COALESCE(?, comments),
      stats_source = COALESCE(?, stats_source), stats_fetched_at = COALESCE(?, stats_fetched_at),
      outlier_score = COALESCE(?, outlier_score), pillar = COALESCE(?, pillar), pillar_source = COALESCE(?, pillar_source),
      channel_id = COALESCE(?, channel_id), niche = COALESCE(?, niche)
      WHERE id = ?`).run(
      v.title ?? null, v.channel_title ?? null, v.published_at ?? null, v.duration_seconds ?? null,
      v.views ?? null, v.likes ?? null, v.comments ?? null, v.stats_source ?? null, v.stats_fetched_at ?? null,
      v.outlier_score ?? null, v.pillar ?? null, v.pillar_source ?? null, v.channel_id ?? null, v.niche ?? null,
      existing.id);
    return db.prepare('SELECT * FROM videos WHERE id = ?').get(existing.id);
  }
  const info = db.prepare(`INSERT INTO videos (platform, external_id, url, title, channel_id, channel_title, published_at,
      duration_seconds, views, likes, comments, stats_source, stats_fetched_at, outlier_score, pillar, pillar_source, niche)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    v.platform || 'youtube', v.external_id ?? null, v.url ?? null, v.title ?? null, v.channel_id ?? null,
    v.channel_title ?? null, v.published_at ?? null, v.duration_seconds ?? null, v.views ?? null, v.likes ?? null,
    v.comments ?? null, v.stats_source ?? null, v.stats_fetched_at ?? null, v.outlier_score ?? null,
    v.pillar ?? null, v.pillar_source ?? null, v.niche ?? null);
  return db.prepare('SELECT * FROM videos WHERE id = ?').get(info.lastInsertRowid);
}

app.post('/api/videos/save', h(async (req, res) => {
  const v = req.body;
  // Provenance is enforced server-side: a client claim of 'youtube_api' is only
  // honored by re-fetching the stats from the API ourselves. Otherwise the row
  // is labeled manual — the source label is a guarantee, not an input field.
  if (v.stats_source === 'youtube_api') {
    if (yt.isConfigured() && v.external_id && (v.platform || 'youtube') === 'youtube') {
      const [fresh] = await yt.videosByIds([v.external_id]);
      if (!fresh) throw httpError(400, 'Claimed YouTube stats could not be verified: the API does not return this video.');
      Object.assign(v, fresh);
      if (v.channel_baseline_views != null && fresh.channel_external_id) {
        // Recompute the claimed baseline from the API instead of trusting it.
        try {
          const b = await yt.channelBaseline(fresh.channel_external_id, { sample: 10 });
          v.channel_baseline_views = b.baseline_views;
          v.channel_baseline_sample = b.baseline_sample;
          v.outlier_score = yt.outlierScore(fresh.views, b.baseline_views);
        } catch {
          v.channel_baseline_views = null; v.channel_baseline_sample = null; v.outlier_score = null;
        }
      }
    } else {
      v.stats_source = v.views != null ? 'manual' : null;
      v.stats_fetched_at = v.views != null ? nowIso() : null;
      v.channel_baseline_views = null; // unverifiable claim → drop, don't relabel
      v.outlier_score = null;
    }
  } else if (v.stats_source != null && v.stats_source !== 'manual') {
    throw httpError(400, `Unknown stats_source ${JSON.stringify(v.stats_source)} — only 'youtube_api' (verified server-side) or 'manual' are accepted.`);
  }
  v.views = parseCount(v.views, 'views');
  v.likes = parseCount(v.likes, 'likes');
  v.comments = parseCount(v.comments, 'comments');
  if (!v.pillar) {
    const cls = classifyPillar(v.title || '');
    v.pillar = cls.pillar; v.pillar_source = 'keyword';
  } else {
    v.pillar_source = v.pillar_source || 'manual';
  }
  v.niche = v.niche || getSetting('niche', 'Riftbound');
  // Persist the channel + baseline if the search result carried one.
  if (v.channel_external_id) {
    const chan = upsertChannel({
      platform: 'youtube', external_id: v.channel_external_id, title: v.channel_title,
      baseline_views: v.channel_baseline_views ?? null, baseline_sample: v.channel_baseline_sample ?? null,
      baseline_source: v.channel_baseline_views != null ? 'youtube_api' : null,
      baseline_fetched_at: v.channel_baseline_views != null ? (v.stats_fetched_at || nowIso()) : null,
    });
    v.channel_id = chan.id;
  }
  res.json(upsertVideo(v));
}));

// Manual import: URL (auto-hydrated when possible) or fully manual fields.
app.post('/api/videos/import', h(async (req, res) => {
  const { title, channel_title, views, likes, comments, duration_seconds, published_at, pillar, platform, transcript, channel_baseline_views } = req.body;
  const url = parseUrl(req.body.url);
  parsePillar(pillar); // reject unknown pillar labels up front
  const videoId = yt.extractVideoId(url);
  const viewsNum = parseCount(views, 'views');
  let base = {
    platform: platform || (videoId ? 'youtube' : 'other'),
    external_id: videoId,
    url,
    title: title || null,
    channel_title: channel_title || null,
    views: viewsNum,
    likes: parseCount(likes, 'likes'),
    comments: parseCount(comments, 'comments'),
    duration_seconds: parseCount(duration_seconds, 'duration_seconds'),
    published_at: published_at || null,
    stats_source: viewsNum != null ? 'manual' : null,
    stats_fetched_at: viewsNum != null ? nowIso() : null,
  };
  let hydrated = false;
  let hydrate_note = null;

  if (videoId && yt.isConfigured()) {
    try {
      const [v] = await yt.videosByIds([videoId]);
      if (v) { base = { ...base, ...v }; hydrated = true; }
    } catch (err) {
      hydrate_note = `Auto-fetch from YouTube failed (${err.message}). Saved with the manually entered fields only.`;
    }
  } else if (videoId && !yt.isConfigured()) {
    hydrate_note = 'No YouTube API key: stats were NOT auto-fetched. The numbers shown are the ones you entered (source: manual).';
  }

  if (!base.title) return res.status(400).json({ error: 'Need at least a title (auto-fetch was unavailable — check the URL or enter fields manually).' });

  const baselineNum = parseCount(channel_baseline_views, 'channel_baseline_views');
  if (baselineNum != null) {
    base.outlier_score = yt.outlierScore(base.views, baselineNum);
    if (base.channel_title || base.channel_external_id) {
      const chan = upsertChannel({
        platform: base.platform, external_id: base.channel_external_id || null, title: base.channel_title,
        baseline_views: baselineNum, baseline_sample: null,
        baseline_source: 'manual', baseline_fetched_at: nowIso(),
      });
      base.channel_id = chan.id;
    }
  } else if (hydrated && base.channel_external_id) {
    try {
      const b = await yt.channelBaseline(base.channel_external_id, { sample: 10 });
      const chan = upsertChannel({ ...b.channel, baseline_views: b.baseline_views, baseline_sample: b.baseline_sample, baseline_source: 'youtube_api', baseline_fetched_at: b.baseline_fetched_at });
      base.channel_id = chan.id;
      base.outlier_score = yt.outlierScore(base.views, b.baseline_views);
    } catch { /* baseline optional */ }
  }

  const cls = classifyPillar(base.title || '');
  base.pillar = pillar || cls.pillar;
  base.pillar_source = pillar ? 'manual' : 'keyword';
  base.niche = getSetting('niche', 'Riftbound');

  const saved = upsertVideo(base);
  if (transcript && transcript.trim()) {
    db.prepare('UPDATE videos SET transcript = ?, transcript_source = ?, transcript_fetched_at = ? WHERE id = ?')
      .run(transcript.trim(), 'manual', nowIso(), saved.id);
  }
  res.json({ ...db.prepare('SELECT * FROM videos WHERE id = ?').get(saved.id), hydrated, hydrate_note });
}));

app.get('/api/videos', h(async (req, res) => {
  let sql = 'SELECT * FROM videos';
  const params = [];
  if (req.query.pillar && req.query.pillar !== 'all') { sql += ' WHERE pillar = ?'; params.push(req.query.pillar); }
  sql += ' ORDER BY (outlier_score IS NULL), outlier_score DESC, created_at DESC';
  res.json(db.prepare(sql).all(...params));
}));

app.get('/api/videos/:id', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  res.json(v);
}));

app.delete('/api/videos/:id', h(async (req, res) => {
  const info = db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

app.patch('/api/videos/:id', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (req.body.pillar) {
    const p = parsePillar(req.body.pillar, { required: true });
    db.prepare('UPDATE videos SET pillar = ?, pillar_source = ? WHERE id = ?').run(p, 'manual', v.id);
  }
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id));
}));

// Refresh stats from the API.
app.post('/api/videos/:id/refresh', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (!v.external_id || v.platform !== 'youtube') return res.status(400).json({ error: 'Only YouTube videos with a known id can be refreshed. Edit stats via manual import instead.' });
  const [fresh] = await yt.videosByIds([v.external_id]);
  if (!fresh) return res.status(404).json({ error: 'YouTube no longer returns this video.' });
  const chan = v.channel_id ? db.prepare('SELECT * FROM channels WHERE id = ?').get(v.channel_id) : null;
  const outlier = chan?.baseline_views ? yt.outlierScore(fresh.views, chan.baseline_views) : v.outlier_score;
  db.prepare('UPDATE videos SET views = ?, likes = ?, comments = ?, stats_source = ?, stats_fetched_at = ?, outlier_score = ? WHERE id = ?')
    .run(fresh.views, fresh.likes, fresh.comments, fresh.stats_source, fresh.stats_fetched_at, outlier, v.id);
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id));
}));

// ---------- transcripts ----------
app.post('/api/videos/:id/transcript', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  const text = (req.body.transcript || '').trim();
  if (!text) return res.status(400).json({ error: 'Transcript text is empty.' });
  db.prepare('UPDATE videos SET transcript = ?, transcript_source = ?, transcript_fetched_at = ? WHERE id = ?')
    .run(text, 'manual', nowIso(), v.id);
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id));
}));

app.post('/api/videos/:id/transcript/fetch', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (v.platform !== 'youtube' || !v.external_id) {
    return res.status(400).json({ error: 'Automatic transcript fetch only works for YouTube videos. Paste the transcript manually.' });
  }
  const result = await tryFetchYouTubeTranscript(v.external_id);
  if (!result.ok) return res.status(424).json({ error: `Transcript fetch failed: ${result.reason}`, manual_path: 'Paste the transcript manually (YouTube: ⋯ menu → Show transcript → copy).' });
  db.prepare('UPDATE videos SET transcript = ?, transcript_source = ?, transcript_fetched_at = ? WHERE id = ?')
    .run(result.transcript, result.source, result.fetched_at, v.id);
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id));
}));

// ---------- analysis ----------
app.post('/api/videos/:id/analyze', h(async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (!v.transcript) return res.status(400).json({ error: 'No transcript yet. Fetch or paste one first — analysis only works from the real transcript.' });
  const { analysis, source } = await analyzeTranscript({
    title: v.title, transcript: v.transcript, pillar: v.pillar, durationSeconds: v.duration_seconds,
  });
  db.prepare('UPDATE videos SET analysis_json = ?, analysis_source = ?, analysis_at = ? WHERE id = ?')
    .run(JSON.stringify(analysis), source, nowIso(), v.id);
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(v.id));
}));

// ---------- vault ----------
app.get('/api/vault', h(async (req, res) => {
  const rows = db.prepare(`SELECT ve.*, v.title AS source_video_title, v.url AS source_video_url
    FROM vault_entries ve LEFT JOIN videos v ON v.id = ve.source_video_id ORDER BY ve.created_at DESC`).all();
  // Attach per-entry performance: my videos that used this entry.
  const mine = db.prepare('SELECT * FROM my_videos').all();
  const summary = myBaseline();
  for (const r of rows) {
    const used = mine.filter((m) => parseJson(m.vault_entry_ids, []).includes(r.id));
    r.used_in = used.length;
    r.avg_vs_baseline = used.length && summary.baseline_views
      ? used.reduce((s, m) => s + m.views / summary.baseline_views, 0) / used.length
      : null;
  }
  res.json(rows);
}));

app.post('/api/vault', h(async (req, res) => {
  const { name, kind, content, notes, source_video_id } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Vault entries need a name and content.' });
  const info = db.prepare('INSERT INTO vault_entries (name, kind, content, notes, source_video_id) VALUES (?, ?, ?, ?, ?)')
    .run(name, kind || 'hook', content, notes || null, source_video_id || null);
  res.json(db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(info.lastInsertRowid));
}));

app.patch('/api/vault/:id', h(async (req, res) => {
  const e = db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Vault entry not found' });
  db.prepare('UPDATE vault_entries SET name = ?, kind = ?, content = ?, notes = ? WHERE id = ?')
    .run(req.body.name ?? e.name, req.body.kind ?? e.kind, req.body.content ?? e.content, req.body.notes ?? e.notes, e.id);
  res.json(db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(e.id));
}));

app.delete('/api/vault/:id', h(async (req, res) => {
  const info = db.prepare('DELETE FROM vault_entries WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

// ---------- scripts ----------
app.get('/api/scripts', h(async (req, res) => {
  res.json(db.prepare('SELECT * FROM scripts ORDER BY updated_at DESC').all());
}));

app.get('/api/scripts/:id', h(async (req, res) => {
  const s = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Script not found' });
  res.json(s);
}));

app.post('/api/scripts', h(async (req, res) => {
  const { title, idea, pillar } = req.body;
  if (!title) return res.status(400).json({ error: 'Scripts need a title.' });
  parsePillar(pillar);
  const info = db.prepare('INSERT INTO scripts (title, idea, pillar) VALUES (?, ?, ?)').run(title, idea || null, pillar || null);
  res.json(db.prepare('SELECT * FROM scripts WHERE id = ?').get(info.lastInsertRowid));
}));

app.patch('/api/scripts/:id', h(async (req, res) => {
  const s = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Script not found' });
  if (req.body.status != null && !['draft', 'final'].includes(req.body.status)) {
    throw httpError(400, '"status" must be \'draft\' or \'final\'.');
  }
  if (req.body.pillar != null) parsePillar(req.body.pillar, { required: true });
  const vaultIds = parseIdArray(req.body.vault_entry_ids, 'vault_entry_ids');
  const videoIds = parseIdArray(req.body.research_video_ids, 'research_video_ids');
  db.prepare(`UPDATE scripts SET title = ?, idea = ?, pillar = ?, content = ?, status = ?,
    vault_entry_ids = ?, research_video_ids = ?, updated_at = datetime('now') WHERE id = ?`).run(
    req.body.title ?? s.title, req.body.idea ?? s.idea, req.body.pillar ?? s.pillar,
    req.body.content ?? s.content, req.body.status ?? s.status,
    vaultIds != null ? JSON.stringify(vaultIds) : s.vault_entry_ids,
    videoIds != null ? JSON.stringify(videoIds) : s.research_video_ids,
    s.id);
  res.json(db.prepare('SELECT * FROM scripts WHERE id = ?').get(s.id));
}));

app.delete('/api/scripts/:id', h(async (req, res) => {
  const info = db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

// Context for the workspace: relevant vault entries, research, own performance.
app.get('/api/scripts/:id/context', h(async (req, res) => {
  const s = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Script not found' });
  const vault = db.prepare('SELECT * FROM vault_entries ORDER BY created_at DESC').all();
  let videos = db.prepare('SELECT * FROM videos ORDER BY (outlier_score IS NULL), outlier_score DESC LIMIT 20').all();
  if (s.pillar) {
    const samePillar = videos.filter((v) => v.pillar === s.pillar);
    if (samePillar.length) videos = samePillar;
  }
  res.json({ vault, videos, performance: myBaseline() });
}));

app.post('/api/scripts/:id/generate', h(async (req, res) => {
  const s = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Script not found' });
  const storedVault = parseJson(s.vault_entry_ids, []);
  const storedVideos = parseJson(s.research_video_ids, []);
  const vaultIds = parseIdArray(req.body.vault_entry_ids, 'vault_entry_ids')
    ?? (Array.isArray(storedVault) ? storedVault : []);
  const videoIds = parseIdArray(req.body.research_video_ids, 'research_video_ids')
    ?? (Array.isArray(storedVideos) ? storedVideos : []);
  const vaultEntries = vaultIds.length
    ? db.prepare(`SELECT * FROM vault_entries WHERE id IN (${vaultIds.map(() => '?').join(',')})`).all(...vaultIds)
    : [];
  const researchVideos = videoIds.length
    ? db.prepare(`SELECT * FROM videos WHERE id IN (${videoIds.map(() => '?').join(',')})`).all(...videoIds)
    : [];
  const perf = myBaseline();
  const myPerformance = perf.count
    ? `Baseline: median ${perf.baseline_views} views over ${perf.count} posted videos (self-reported). Best pillar so far: ${perf.best_pillar || 'n/a'}.`
    : 'No posted videos logged yet.';

  const { content, source } = await draftScript({
    idea: s.idea || s.title, pillar: s.pillar, vaultEntries, researchVideos, myPerformance,
  });
  db.prepare(`UPDATE scripts SET content = ?, generation_source = ?, vault_entry_ids = ?, research_video_ids = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(content, source, JSON.stringify(vaultIds), JSON.stringify(videoIds), s.id);
  res.json(db.prepare('SELECT * FROM scripts WHERE id = ?').get(s.id));
}));

// ---------- my videos ----------
function myBaseline() {
  const mine = db.prepare('SELECT * FROM my_videos ORDER BY posted_at DESC, created_at DESC').all();
  const views = mine.map((m) => m.views).sort((a, b) => a - b);
  let baseline = null;
  if (views.length) {
    const mid = Math.floor(views.length / 2);
    baseline = views.length % 2 ? views[mid] : (views[mid - 1] + views[mid]) / 2;
  }
  const byPillar = {};
  for (const m of mine) {
    const p = m.pillar || 'other';
    (byPillar[p] = byPillar[p] || []).push(m.views);
  }
  let best_pillar = null; let bestAvg = -1;
  for (const [p, arr] of Object.entries(byPillar)) {
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    if (avg > bestAvg) { bestAvg = avg; best_pillar = p; }
  }
  return { count: mine.length, baseline_views: baseline, best_pillar: mine.length ? best_pillar : null, source: 'manual (self-reported stats)' };
}

app.get('/api/myvideos', h(async (req, res) => {
  const mine = db.prepare(`SELECT mv.*, s.title AS script_title FROM my_videos mv
    LEFT JOIN scripts s ON s.id = mv.script_id ORDER BY mv.posted_at DESC, mv.created_at DESC`).all();
  const summary = myBaseline();
  for (const m of mine) {
    m.vs_baseline = summary.baseline_views ? m.views / summary.baseline_views : null;
  }
  res.json({ summary, videos: mine });
}));

app.post('/api/myvideos', h(async (req, res) => {
  const { platform, url, title, posted_at, views, likes, comments, retention_pct, script_id, pillar, vault_entry_ids, notes } = req.body;
  if (!title || views == null || views === '') return res.status(400).json({ error: 'Need at least a title and view count.' });
  const viewsNum = parseCount(views, 'views');
  if (viewsNum == null) return res.status(400).json({ error: 'Need at least a title and view count.' });
  parsePillar(pillar);
  const info = db.prepare(`INSERT INTO my_videos (platform, url, title, posted_at, views, likes, comments, retention_pct, script_id, pillar, vault_entry_ids, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    platform || 'youtube', parseUrl(url), title, posted_at || null, viewsNum,
    parseCount(likes, 'likes'), parseCount(comments, 'comments'),
    parseCount(retention_pct, 'retention_pct', { max: 100 }),
    script_id || null, pillar || null, JSON.stringify(parseIdArray(vault_entry_ids, 'vault_entry_ids') || []), notes || null);
  res.json(db.prepare('SELECT * FROM my_videos WHERE id = ?').get(info.lastInsertRowid));
}));

app.patch('/api/myvideos/:id', h(async (req, res) => {
  const m = db.prepare('SELECT * FROM my_videos WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  // Same validation as create: a mutated stat is still a stat.
  const views = req.body.views != null ? parseCount(req.body.views, 'views') : m.views;
  if (views == null) throw httpError(400, '"views" cannot be cleared — it anchors your baseline.');
  const likes = req.body.likes !== undefined ? parseCount(req.body.likes, 'likes') : m.likes;
  const comments = req.body.comments !== undefined ? parseCount(req.body.comments, 'comments') : m.comments;
  const retention = req.body.retention_pct !== undefined ? parseCount(req.body.retention_pct, 'retention_pct', { max: 100 }) : m.retention_pct;
  const pillar = req.body.pillar != null ? parsePillar(req.body.pillar, { required: true }) : m.pillar;
  db.prepare(`UPDATE my_videos SET title = ?, views = ?, likes = ?, comments = ?, retention_pct = ?, pillar = ?, script_id = ?, notes = ?, stats_entered_at = datetime('now') WHERE id = ?`)
    .run(req.body.title ?? m.title, views, likes, comments, retention, pillar,
      req.body.script_id ?? m.script_id, req.body.notes ?? m.notes, m.id);
  res.json(db.prepare('SELECT * FROM my_videos WHERE id = ?').get(m.id));
}));

app.delete('/api/myvideos/:id', h(async (req, res) => {
  const info = db.prepare('DELETE FROM my_videos WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}));

// ---------- export ----------
app.get('/api/export', h(async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="riftbound-studio-export.json"');
  res.json(exportAll());
}));

// Body-parser and other middleware errors must come back as JSON too — never
// an HTML stack trace.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.type === 'entity.parse.failed' ? 400 : (err.status || 500);
  res.status(status).json({
    error: err.type === 'entity.parse.failed' ? 'Malformed JSON request body.' : err.message || 'Internal error',
  });
});

app.listen(PORT, () => {
  console.log(`Riftbound Studio running at http://localhost:${PORT}`);
  console.log(`Data: ${DB_PATH}`);
  console.log(`YouTube API: ${yt.isConfigured() ? 'configured' : 'NOT configured (manual import mode)'}`);
  console.log(`Claude: ${llm.isConfigured() ? `configured (${llm.MODEL})` : 'NOT configured (rule-based analysis + template scaffolds)'}`);
});
