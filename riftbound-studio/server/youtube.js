// YouTube Data API v3 client. The only platform with a real, terms-compliant API.
// Every function here refuses to run without YOUTUBE_API_KEY and never invents
// numbers: results carry stats_source 'youtube_api' and a fetch timestamp.
const API = 'https://www.googleapis.com/youtube/v3';

export function isConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

class YouTubeError extends Error {
  constructor(message, { status, reason } = {}) {
    super(message);
    this.name = 'YouTubeError';
    this.status = status;
    this.reason = reason;
  }
}
export { YouTubeError };

async function yt(endpoint, params) {
  if (!isConfigured()) {
    throw new YouTubeError(
      'YouTube API key not configured. Set YOUTUBE_API_KEY in .env (free key: Google Cloud Console → enable "YouTube Data API v3" → Credentials). Until then, use manual import.',
      { status: 0, reason: 'not_configured' }
    );
  }
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  let res;
  try {
    res = await fetch(`${API}/${endpoint}?${qs}`, { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    throw new YouTubeError(
      `Could not reach the YouTube API (network error: ${err.message}). Check your connection/network policy, or use manual import.`,
      { status: 0, reason: 'network' }
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiErr = body?.error;
    const reason = apiErr?.errors?.[0]?.reason || 'api_error';
    throw new YouTubeError(
      `YouTube API error (${res.status} ${reason}): ${apiErr?.message || 'unknown error'}`,
      { status: res.status, reason }
    );
  }
  return body;
}

// ISO8601 duration (PT1M30S) → seconds
export function parseDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return null;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const short = /^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
      if (short) return short[2];
    }
  } catch { /* not a URL */ }
  return null;
}

const median = (nums) => {
  const a = [...nums].sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

// Fetch full stats for up to 50 video ids.
export async function videosByIds(ids) {
  if (!ids.length) return [];
  const body = await yt('videos', {
    part: 'snippet,statistics,contentDetails',
    id: ids.slice(0, 50).join(','),
  });
  const fetchedAt = new Date().toISOString();
  return (body.items || []).map((v) => ({
    external_id: v.id,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    title: v.snippet?.title,
    channel_external_id: v.snippet?.channelId,
    channel_title: v.snippet?.channelTitle,
    published_at: v.snippet?.publishedAt,
    duration_seconds: parseDuration(v.contentDetails?.duration),
    views: v.statistics?.viewCount != null ? Number(v.statistics.viewCount) : null,
    likes: v.statistics?.likeCount != null ? Number(v.statistics.likeCount) : null,
    comments: v.statistics?.commentCount != null ? Number(v.statistics.commentCount) : null,
    stats_source: 'youtube_api',
    stats_fetched_at: fetchedAt,
  }));
}

// Channel metadata (title, uploads playlist, subs) for up to 50 channel ids.
export async function channelsByIds(ids) {
  if (!ids.length) return new Map();
  const body = await yt('channels', {
    part: 'snippet,statistics,contentDetails',
    id: [...new Set(ids)].slice(0, 50).join(','),
  });
  const fetchedAt = new Date().toISOString();
  const map = new Map();
  for (const c of body.items || []) {
    map.set(c.id, {
      external_id: c.id,
      title: c.snippet?.title,
      handle: c.snippet?.customUrl,
      url: `https://www.youtube.com/channel/${c.id}`,
      subscriber_count: c.statistics?.subscriberCount != null ? Number(c.statistics.subscriberCount) : null,
      uploads_playlist: c.contentDetails?.relatedPlaylists?.uploads,
      stats_source: 'youtube_api',
      stats_fetched_at: fetchedAt,
    });
  }
  return map;
}

// Channel baseline = median views of its recent uploads (up to `sample`).
// This is the denominator for the outlier score.
export async function channelBaseline(channelExternalId, { sample = 15 } = {}) {
  const channels = await channelsByIds([channelExternalId]);
  const chan = channels.get(channelExternalId);
  if (!chan?.uploads_playlist) {
    throw new YouTubeError(`Channel ${channelExternalId} not found or has no uploads playlist.`, { reason: 'not_found' });
  }
  const items = await yt('playlistItems', {
    part: 'contentDetails',
    playlistId: chan.uploads_playlist,
    maxResults: String(Math.min(sample, 50)),
  });
  const ids = (items.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  const vids = await videosByIds(ids);
  const views = vids.map((v) => v.views).filter((n) => n != null);
  return {
    channel: chan,
    baseline_views: median(views),
    baseline_sample: views.length,
    baseline_source: 'youtube_api',
    baseline_fetched_at: new Date().toISOString(),
    recent_videos: vids,
  };
}

// Recent uploads for a watchlisted channel (hydrated with stats).
export async function channelRecentVideos(channelExternalId, { limit = 15 } = {}) {
  const { channel, recent_videos, baseline_views, baseline_sample, baseline_fetched_at } =
    await channelBaseline(channelExternalId, { sample: limit });
  return { channel, videos: recent_videos, baseline_views, baseline_sample, baseline_fetched_at };
}

// Search short-form videos for a niche query. Costs 100 quota units per call.
// videoDuration=short means <4 min; we keep <=180s to approximate Shorts.
export async function searchShorts(query, { maxResults = 25, publishedAfter, maxDurationSeconds = 180 } = {}) {
  const params = {
    part: 'snippet',
    q: query,
    type: 'video',
    videoDuration: 'short',
    order: 'viewCount',
    maxResults: String(Math.min(maxResults, 50)),
  };
  if (publishedAfter) params.publishedAfter = publishedAfter;
  const body = await yt('search', params);
  const ids = (body.items || []).map((i) => i.id?.videoId).filter(Boolean);
  const vids = await videosByIds(ids);
  return vids.filter((v) => v.duration_seconds == null || v.duration_seconds <= maxDurationSeconds);
}

// Compute baselines for the distinct channels of a video list, batching to
// keep quota sane. Returns Map<channel_external_id, baselineInfo>.
export async function baselinesForChannels(channelIds, { sample = 10, maxChannels = 12 } = {}) {
  const distinct = [...new Set(channelIds)].slice(0, maxChannels);
  const out = new Map();
  for (const id of distinct) {
    try {
      const b = await channelBaseline(id, { sample });
      out.set(id, b);
    } catch (err) {
      out.set(id, { error: err.message });
    }
  }
  return out;
}

export function outlierScore(views, baseline) {
  if (views == null || !baseline || baseline <= 0) return null;
  return views / baseline;
}
