# Riftbound Studio

A content-creation studio for TCG short-form creators — Riftbound (Riot's League of
Legends TCG) first, any niche second. One workflow, closed loop:

**research what's winning → understand why it won → script from that evidence →
post → measure against your own baseline → feed it back into the next script.**

## Start

```bash
npm install && npm start
```

Open http://localhost:4173. That's it — SQLite persistence is automatic (`data/`).

Requires Node.js ≥ 20 (uses `--env-file-if-exists`; on Node 20.x, export the env
vars in your shell instead).

## API keys (optional, but they unlock the live half)

Copy `.env.example` to `.env` and fill in what you have:

| Key | Unlocks | Without it |
|---|---|---|
| `YOUTUBE_API_KEY` | Live Shorts search ranked by outlier score, channel baselines, watchlist recent-videos, stat refresh, URL auto-hydration | Manual import: paste URL + the stats you can see; outlier scores from a baseline you supply |
| `ANTHROPIC_API_KEY` | Claude hook/format analysis (quotes the real opening line) and full script drafting | Deterministic rule-based analysis (still quotes the real opening line) and fill-in script scaffolds |

The UI always tells you which mode you're in and labels every number with its
source (`YouTube API` / `manual`) and fetch time.

## What each platform integration can and can't do

- **YouTube** — real API. Search, video stats, channel stats, recent uploads,
  outlier baselines: all live with a key. Captions/transcripts are *not* served
  by the official API without the video owner's OAuth; the app attempts the
  public caption endpoint (works on normal home networks, breaks on locked-down
  ones and whenever YouTube changes it) and otherwise asks you to paste the
  transcript (YouTube: ⋯ → Show transcript → copy).
- **TikTok / Instagram** — no public read API for research. Manual import is the
  supported path, by design: paste the URL, the stats you can see, and the
  transcript. Nothing is scraped, nothing is invented.

## House rules the code enforces

- **No fabricated data.** Every metric row stores `source` + `fetched_at` and the
  UI displays both. Empty states say "nothing here yet", never fake loading.
- **Honest fallbacks.** When an integration is off/unreachable you get a plain
  explanation plus a manual path — not a silent failure, not demo numbers.
- **Falsifiable analysis.** Hook breakdowns quote the actual opening words; the
  rule-based engine only reports checkable properties (question? number? direct
  address? words/min). Claude is prompted under the same rules and each analysis
  is labeled with its engine.
- **Your data persists.** SQLite at `data/riftbound-studio.db` (WAL mode), and
  **Export data** in the header downloads everything as JSON.
- **Secrets stay out of the code.** Keys come from `.env`/environment only;
  `.env` and `data/` are gitignored.

## The loop, mapped to the UI

1. **Research** — live search (outlier-ranked) or manual import; watchlist
   channels with baselines; per-video transcript + "why it won" breakdown.
2. **Vault** — save a hook/format/style as a named template; each entry shows how
   often you've used it and how those videos did against your baseline.
3. **Scripts** — workspace pulls your Vault + saved research + your own
   performance; drafts a 30–60s short whose opening visibly descends from a
   named vault entry (`[opening based on vault #N]`). Card prices are never
   invented — drafts use `[FILL: …]` placeholders for numbers you must source.
4. **My Videos** — log posted videos (self-reported stats, labeled as such),
   see your median baseline and each video against it, linked back to its script
   and vault entries.

## Architecture

Node + Express + better-sqlite3, vanilla JS frontend, no build step.

```
server/
  index.js       routes
  db.js          schema + persistence (SQLite, WAL)
  youtube.js     YouTube Data API v3 (search, stats, baselines, outlier math)
  transcripts.js caption fetch attempt + honest failure
  llm.js         Claude client (structured JSON via output_config)
  analyze.js     hook/format breakdown (Claude or rule-based)
  scriptgen.js   script drafting (Claude or template scaffold)
  pillars.js     keyword pillar classifier (market/competitive/skit)
public/          single-page UI
data/            your SQLite database (gitignored)
```

## Tests

```bash
npm test
```

Covers outlier math, duration/URL parsing, pillar classification, rule-based
analysis, and a full API round-trip against a temp database.
