// SQLite persistence. Everything the user owns lives here and survives restarts.
// Honesty rule: every metric row records where it came from (source) and when
// (fetched_at / entered_at). Nothing in this schema permits an unsourced number.
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.RIFTBOUND_DATA_DIR || path.join(here, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const DB_PATH = path.join(dataDir, 'riftbound-studio.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL DEFAULT 'youtube',
  external_id TEXT,                -- e.g. YouTube channel id
  handle TEXT,
  title TEXT,
  url TEXT,
  watchlisted INTEGER NOT NULL DEFAULT 0,
  baseline_views REAL,             -- median views of recent videos
  baseline_sample INTEGER,         -- how many videos the median came from
  baseline_source TEXT,            -- 'youtube_api' | 'manual'
  baseline_fetched_at TEXT,
  subscriber_count INTEGER,
  stats_source TEXT,
  stats_fetched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, external_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  external_id TEXT,                -- e.g. YouTube video id
  url TEXT,
  title TEXT,
  channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
  channel_title TEXT,              -- denormalized for manual entries
  published_at TEXT,
  duration_seconds INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  stats_source TEXT,               -- 'youtube_api' | 'manual' (NULL until stats exist)
  stats_fetched_at TEXT,
  outlier_score REAL,              -- views / channel baseline (NULL if baseline unknown)
  pillar TEXT,                     -- 'market' | 'competitive' | 'skit' | 'other'
  pillar_source TEXT,              -- 'keyword' | 'manual'
  niche TEXT,
  transcript TEXT,
  transcript_source TEXT,          -- 'manual' | 'youtube_captions'
  transcript_fetched_at TEXT,
  analysis_json TEXT,              -- hook/format breakdown
  analysis_source TEXT,            -- 'claude:<model>' | 'rules'
  analysis_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, external_id)
);

CREATE TABLE IF NOT EXISTS vault_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'hook',   -- 'hook' | 'format' | 'style'
  content TEXT NOT NULL,               -- the reusable template text
  notes TEXT,
  source_video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  idea TEXT,
  pillar TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',    -- 'draft' | 'final'
  vault_entry_ids TEXT NOT NULL DEFAULT '[]',    -- JSON array of vault ids used
  research_video_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of video ids referenced
  generation_source TEXT,                  -- 'claude:<model>' | 'template' | 'user'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS my_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  url TEXT,
  title TEXT NOT NULL,
  posted_at TEXT,
  views INTEGER NOT NULL,
  likes INTEGER,
  comments INTEGER,
  retention_pct REAL,
  stats_entered_at TEXT NOT NULL DEFAULT (datetime('now')),  -- self-reported: source is always 'manual'
  script_id INTEGER REFERENCES scripts(id) ON DELETE SET NULL,
  pillar TEXT,
  vault_entry_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export default db;

// ---- settings ----
export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

// ---- export (the user's data is theirs) ----
export function exportAll() {
  return {
    exported_at: new Date().toISOString(),
    settings: db.prepare('SELECT * FROM settings').all(),
    channels: db.prepare('SELECT * FROM channels').all(),
    videos: db.prepare('SELECT * FROM videos').all(),
    vault_entries: db.prepare('SELECT * FROM vault_entries').all(),
    scripts: db.prepare('SELECT * FROM scripts').all(),
    my_videos: db.prepare('SELECT * FROM my_videos').all(),
  };
}
