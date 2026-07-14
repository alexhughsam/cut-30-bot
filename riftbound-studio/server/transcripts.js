// Transcript acquisition. YouTube's official Data API does not serve captions
// without OAuth from the video owner, so automatic fetching uses the public
// timedtext endpoint on youtube.com — which works on a normal machine but is
// blocked in locked-down networks and breaks whenever YouTube changes it.
// We try honestly, fail honestly, and always offer manual paste as the
// first-class path.

async function fetchWithTimeout(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
}

// Attempt: youtube.com watch page → captionTracks → timedtext JSON3.
export async function tryFetchYouTubeTranscript(videoId) {
  let html;
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'accept-language': 'en' },
    });
    if (!res.ok) return { ok: false, reason: `youtube.com is unreachable (HTTP ${res.status} — this network may block it, or YouTube refused the request)` };
    html = await res.text();
  } catch (err) {
    return { ok: false, reason: `Could not reach youtube.com (${err.message}). This network may block it; paste the transcript manually or run the app on a machine with open internet.` };
  }

  const m = html.match(/"captionTracks":(\[.*?\])/s);
  if (!m) return { ok: false, reason: 'No caption tracks found on the watch page (video may have no captions, or YouTube changed its page format).' };

  let tracks;
  try {
    tracks = JSON.parse(m[1]);
  } catch {
    return { ok: false, reason: 'Could not parse caption track data from the watch page.' };
  }
  const track = tracks.find((t) => t.languageCode?.startsWith('en')) || tracks[0];
  if (!track?.baseUrl) return { ok: false, reason: 'Caption track had no usable URL.' };

  try {
    const url = track.baseUrl.includes('fmt=') ? track.baseUrl : `${track.baseUrl}&fmt=json3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { ok: false, reason: `Caption endpoint returned HTTP ${res.status}` };
    const data = await res.json();
    const text = (data.events || [])
      .flatMap((e) => (e.segs || []).map((s) => s.utf8))
      .join('')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return { ok: false, reason: 'Caption track was empty.' };
    return {
      ok: true,
      transcript: text,
      source: 'youtube_captions',
      language: track.languageCode,
      auto_generated: track.kind === 'asr',
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, reason: `Failed to download captions (${err.message}).` };
  }
}
