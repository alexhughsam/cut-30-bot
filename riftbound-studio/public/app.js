/* Riftbound Studio frontend — vanilla JS, no build step. */
'use strict';

const view = document.getElementById('view');
const state = {
  status: null,
  tab: 'research',
  pillarFilter: 'all',
  selectedVideoId: null,
  selectedScriptId: null,
  searchResults: null,
  searchError: null,
  searchMeta: null,
};

// ---------- utilities ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.manual_path = data.manual_path;
    throw err;
  }
  return data;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => (n == null ? '—' : Number(n).toLocaleString());
const dateShort = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

function toast(msg, ms = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

function statNote(source, fetchedAt) {
  if (!source) return '<span class="stat-note">no stats recorded</span>';
  const label = { youtube_api: 'YouTube API', manual: 'entered manually', youtube_captions: 'YouTube captions' }[source] || source;
  return `<span class="stat-note">source: ${esc(label)} · ${esc(dateTime(fetchedAt))}</span>`;
}

function outlierCell(score) {
  if (score == null) return '<span class="outlier na">n/a (no baseline)</span>';
  const cls = score >= 5 ? 'hot' : score >= 2 ? 'warm' : '';
  return `<span class="outlier ${cls}">×${Number(score).toFixed(1)}</span>`;
}

const pillarPill = (p) => `<span class="pill ${esc(p || 'other')}">${esc(p || 'other')}</span>`;

function pillarSelect(id, value, includeAll = false) {
  const opts = (includeAll ? ['all'] : []).concat(['market', 'competitive', 'skit', 'other']);
  return `<select id="${id}">${opts.map((p) => `<option value="${p}" ${p === (value || (includeAll ? 'all' : 'other')) ? 'selected' : ''}>${p}</option>`).join('')}</select>`;
}

// ---------- status banner ----------
function renderBanner() {
  const el = document.getElementById('integration-banner');
  if (!state.status) { el.innerHTML = ''; return; }
  const ints = state.status.integrations;
  const parts = [];
  for (const key of ['youtube', 'claude']) {
    const i = ints[key];
    parts.push(`<div class="banner ${i.configured ? 'ok' : 'warn'}"><strong>${key === 'youtube' ? 'YouTube' : 'Claude AI'}:</strong> ${esc(i.note)}</div>`);
  }
  el.innerHTML = parts.join('');
  document.getElementById('niche-label').textContent = `niche: ${state.status.niche}`;
}

// ---------- tab switching ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b === btn));
  render();
});

async function render() {
  try {
    if (state.tab === 'research') await renderResearch();
    else if (state.tab === 'vault') await renderVault();
    else if (state.tab === 'scripts') await renderScripts();
    else if (state.tab === 'mine') await renderMine();
  } catch (err) {
    view.innerHTML = `<div class="error-box">Failed to load: ${esc(err.message)}</div>`;
  }
}

// =============================================================
// RESEARCH TAB
// =============================================================
async function renderResearch() {
  const [videos, channels] = await Promise.all([
    api(`/api/videos?pillar=${state.pillarFilter}`),
    api('/api/channels'),
  ]);
  const ytOn = state.status?.integrations?.youtube?.configured;

  view.innerHTML = `
  <div class="grid">
    <div class="card">
      <h2>Find what's winning</h2>
      <p class="sub">Live YouTube Shorts search for your niche, ranked by outlier score (views ÷ channel's median recent views). ${ytOn ? '' : '<strong>Currently disabled — no API key.</strong> Use manual import below.'}</p>
      <div class="row">
        <input id="search-q" placeholder="query (blank = niche default)" style="flex:1; min-width:200px" />
        ${pillarSelect('search-pillar', 'all', true)}
        <select id="search-days"><option value="30">last 30d</option><option value="90" selected>last 90d</option><option value="365">last year</option></select>
        <button class="btn primary" id="btn-search" ${ytOn ? '' : 'disabled title="Needs YOUTUBE_API_KEY"'}>Search</button>
      </div>
      <div id="search-out"></div>
    </div>

    <div class="card">
      <h2>Manual import</h2>
      <p class="sub">First-class path for TikTok/Instagram (no readable API) and for when YouTube live data is off. Paste what you can see on the platform; everything you enter is labeled "manual".</p>
      <div class="grid cols-2">
        <div>
          <div class="field"><label>Video URL (YouTube URLs auto-fetch stats when the API key is set)</label><input id="imp-url" placeholder="https://..." style="width:100%" /></div>
          <div class="field"><label>Title *</label><input id="imp-title" style="width:100%" /></div>
          <div class="field"><label>Channel / creator name</label><input id="imp-channel" style="width:100%" /></div>
          <div class="row">
            <div class="field"><label>Views</label><input id="imp-views" type="number" min="0" style="width:110px" /></div>
            <div class="field"><label>Likes</label><input id="imp-likes" type="number" min="0" style="width:100px" /></div>
            <div class="field"><label>Comments</label><input id="imp-comments" type="number" min="0" style="width:100px" /></div>
            <div class="field"><label>Duration (s)</label><input id="imp-duration" type="number" min="0" style="width:100px" /></div>
          </div>
        </div>
        <div>
          <div class="field"><label>Channel's typical views (median of their recent videos — enables the outlier score)</label><input id="imp-baseline" type="number" min="0" style="width:100%" /></div>
          <div class="field"><label>Pillar (blank = keyword guess)</label>
            <select id="imp-pillar"><option value="">auto (keyword guess)</option><option>market</option><option>competitive</option><option>skit</option><option>other</option></select>
          </div>
          <div class="field"><label>Transcript (optional — paste from the platform's transcript view)</label><textarea id="imp-transcript" rows="4"></textarea></div>
          <button class="btn primary" id="btn-import">Import video</button>
        </div>
      </div>
      <div id="import-out"></div>
    </div>

    <div class="card">
      <div class="row between">
        <h2>Research library <span class="muted">(${videos.length})</span></h2>
        <div class="row"><label style="margin:0">pillar</label>${pillarSelect('lib-pillar', state.pillarFilter, true)}</div>
      </div>
      <p class="sub">Saved videos. Click a row for transcript, analysis, and "save to Vault".</p>
      ${videos.length ? libraryTable(videos) : '<div class="empty">Nothing saved yet. Run a live search (needs API key) or import a video manually above — no fake data will ever appear here.</div>'}
      <div id="video-detail"></div>
    </div>

    <div class="card">
      <h2>Watchlist</h2>
      <p class="sub">Channels you track. Baseline = median views of recent uploads; it's the denominator of every outlier score.</p>
      <div class="row">
        <input id="watch-id" placeholder="${ytOn ? 'YouTube channel ID (UC...)' : 'channel name (no API key: manual mode)'}" style="min-width:220px" />
        ${ytOn ? '' : '<input id="watch-baseline" type="number" min="0" placeholder="typical views (median)" style="width:170px" />'}
        <button class="btn" id="btn-watch">Add to watchlist</button>
      </div>
      <div id="watch-out"></div>
      ${channels.filter((c) => c.watchlisted).length ? watchlistTable(channels.filter((c) => c.watchlisted)) : '<div class="empty" style="margin-top:10px">No watched channels yet.</div>'}
      <div id="channel-videos"></div>
    </div>
  </div>`;

  wireResearch();
  if (state.searchResults || state.searchError) paintSearchResults();
  if (state.selectedVideoId) paintVideoDetail(state.selectedVideoId);
}

function libraryTable(videos) {
  return `<table><thead><tr><th>title</th><th>channel</th><th>views</th><th>outlier</th><th>pillar</th><th>platform</th><th>saved</th></tr></thead>
  <tbody>${videos.map((v) => `
    <tr class="clickable ${v.id === state.selectedVideoId ? 'selected' : ''}" data-video="${v.id}">
      <td>${esc(v.title)}${v.url ? ` <a href="${esc(v.url)}" target="_blank" onclick="event.stopPropagation()">↗</a>` : ''}</td>
      <td>${esc(v.channel_title || '—')}</td>
      <td class="mono">${num(v.views)}<br>${statNote(v.stats_source, v.stats_fetched_at)}</td>
      <td>${outlierCell(v.outlier_score)}</td>
      <td>${pillarPill(v.pillar)} ${v.pillar_source === 'keyword' ? '<span class="pill src" title="Guessed from title keywords — click the row to override">auto</span>' : ''}</td>
      <td>${esc(v.platform)}</td>
      <td class="muted">${dateShort(v.created_at)}</td>
    </tr>`).join('')}</tbody></table>`;
}

function watchlistTable(channels) {
  return `<table style="margin-top:10px"><thead><tr><th>channel</th><th>baseline (median views)</th><th>subs</th><th></th></tr></thead>
  <tbody>${channels.map((c) => `
    <tr>
      <td>${esc(c.title || c.handle || c.external_id)}</td>
      <td class="mono">${num(c.baseline_views)} ${c.baseline_sample ? `<span class="muted">(n=${c.baseline_sample})</span>` : ''}<br>${statNote(c.baseline_source, c.baseline_fetched_at)}</td>
      <td class="mono">${num(c.subscriber_count)}</td>
      <td class="row">
        ${c.external_id ? `<button class="btn small" data-chan-videos="${c.id}">Recent videos</button>` : ''}
        <button class="btn small danger" data-unwatch="${c.id}">Remove</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
}

function wireResearch() {
  document.getElementById('lib-pillar').addEventListener('change', (e) => {
    state.pillarFilter = e.target.value;
    renderResearch();
  });

  document.getElementById('btn-search')?.addEventListener('click', async (e) => {
    const btn = e.target; btn.disabled = true; btn.textContent = 'Searching…';
    state.searchResults = null; state.searchError = null;
    try {
      const q = document.getElementById('search-q').value.trim();
      const pillar = document.getElementById('search-pillar').value;
      const days = document.getElementById('search-days').value;
      const data = await api(`/api/research/search?q=${encodeURIComponent(q)}&pillar=${pillar}&days=${days}`);
      state.searchResults = data.results; state.searchMeta = data;
    } catch (err) {
      state.searchError = err.message;
    }
    btn.disabled = false; btn.textContent = 'Search';
    paintSearchResults();
  });

  document.getElementById('btn-import').addEventListener('click', async () => {
    const out = document.getElementById('import-out');
    try {
      const body = {
        url: document.getElementById('imp-url').value.trim() || null,
        title: document.getElementById('imp-title').value.trim() || null,
        channel_title: document.getElementById('imp-channel').value.trim() || null,
        views: document.getElementById('imp-views').value,
        likes: document.getElementById('imp-likes').value,
        comments: document.getElementById('imp-comments').value,
        duration_seconds: document.getElementById('imp-duration').value,
        channel_baseline_views: document.getElementById('imp-baseline').value,
        pillar: document.getElementById('imp-pillar').value || null,
        transcript: document.getElementById('imp-transcript').value,
      };
      const saved = await api('/api/videos/import', { method: 'POST', body });
      toast(`Imported "${saved.title}"${saved.hydrated ? ' (stats fetched live from YouTube API)' : ''}`);
      if (saved.hydrate_note) out.innerHTML = `<div class="banner warn">${esc(saved.hydrate_note)}</div>`;
      state.selectedVideoId = saved.id;
      renderResearch();
    } catch (err) {
      out.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
    }
  });

  document.getElementById('btn-watch').addEventListener('click', async () => {
    const out = document.getElementById('watch-out');
    const idOrName = document.getElementById('watch-id').value.trim();
    if (!idOrName) return;
    try {
      const ytOn = state.status?.integrations?.youtube?.configured;
      const body = ytOn && /^UC[\w-]{10,}$/.test(idOrName)
        ? { external_id: idOrName }
        : { title: idOrName, manual_baseline_views: document.getElementById('watch-baseline')?.value || null };
      if (ytOn && !body.external_id) {
        out.innerHTML = '<div class="error-box">With the API enabled, paste the channel ID (starts with UC — find it in the channel page URL or its "About" → share channel → copy ID).</div>';
        return;
      }
      await api('/api/channels/watch', { method: 'POST', body });
      toast('Channel added to watchlist');
      renderResearch();
    } catch (err) {
      out.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
    }
  });

  view.querySelectorAll('[data-unwatch]').forEach((b) => b.addEventListener('click', async () => {
    await api(`/api/channels/${b.dataset.unwatch}/watch`, { method: 'DELETE' });
    renderResearch();
  }));

  view.querySelectorAll('[data-chan-videos]').forEach((b) => b.addEventListener('click', async () => {
    const out = document.getElementById('channel-videos');
    out.innerHTML = '<p class="muted">Loading channel videos…</p>';
    try {
      const data = await api(`/api/channels/${b.dataset.chanVideos}/videos`);
      out.innerHTML = `<h3>${esc(data.channel.title)} — recent uploads (baseline ${num(data.baseline_views)}, n=${data.baseline_sample})</h3>
        <table><thead><tr><th>title</th><th>views</th><th>outlier</th><th>published</th><th></th></tr></thead><tbody>
        ${data.videos.map((v) => `<tr><td>${esc(v.title)} <a href="${esc(v.url)}" target="_blank">↗</a></td>
          <td class="mono">${num(v.views)}<br>${statNote(v.stats_source, v.stats_fetched_at)}</td>
          <td>${outlierCell(v.outlier_score)}</td><td class="muted">${dateShort(v.published_at)}</td>
          <td><button class="btn small" data-save-result='${esc(JSON.stringify({ ...v, channel_baseline_views: data.baseline_views, channel_baseline_sample: data.baseline_sample }))}'>Save</button></td></tr>`).join('')}
        </tbody></table>`;
      wireSaveResultButtons(out);
    } catch (err) {
      out.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
    }
  }));

  view.querySelectorAll('tr[data-video]').forEach((tr) => tr.addEventListener('click', () => {
    state.selectedVideoId = Number(tr.dataset.video);
    renderResearch();
  }));
}

function paintSearchResults() {
  const out = document.getElementById('search-out');
  if (!out) return;
  if (state.searchError) {
    out.innerHTML = `<div class="error-box">${esc(state.searchError)}</div>`;
    return;
  }
  const rs = state.searchResults || [];
  const meta = state.searchMeta;
  out.innerHTML = `
    <p class="sub" style="margin-top:10px">Query: <em>${esc(meta.query)}</em> · fetched ${dateTime(meta.fetched_at)} · source: YouTube Data API. Outlier = views ÷ channel median (n shown). Channels beyond the first 12 aren't baseline-scored to protect API quota.</p>
    ${rs.length ? `<table><thead><tr><th>title</th><th>channel</th><th>views</th><th>outlier</th><th>pillar guess</th><th>len</th><th></th></tr></thead><tbody>
    ${rs.map((v) => `<tr>
      <td>${esc(v.title)} <a href="${esc(v.url)}" target="_blank">↗</a></td>
      <td>${esc(v.channel_title)}</td>
      <td class="mono">${num(v.views)}<br>${statNote(v.stats_source, v.stats_fetched_at)}</td>
      <td>${outlierCell(v.outlier_score)}${v.channel_baseline_views ? `<br><span class="stat-note">baseline ${num(v.channel_baseline_views)} (n=${v.channel_baseline_sample})</span>` : (v.baseline_error ? `<br><span class="stat-note">baseline error</span>` : '')}</td>
      <td>${pillarPill(v.pillar_guess)}${v.pillar_keywords?.length ? `<br><span class="stat-note">matched: ${esc(v.pillar_keywords.slice(0, 3).join(', '))}</span>` : ''}</td>
      <td class="mono">${v.duration_seconds != null ? v.duration_seconds + 's' : '—'}</td>
      <td><button class="btn small" data-save-result='${esc(JSON.stringify(v))}'>Save</button></td>
    </tr>`).join('')}</tbody></table>` : '<div class="empty">No results for that query/window.</div>'}`;
  wireSaveResultButtons(out);
}

function wireSaveResultButtons(root) {
  root.querySelectorAll('[data-save-result]').forEach((b) => b.addEventListener('click', async () => {
    try {
      const v = JSON.parse(b.dataset.saveResult);
      const saved = await api('/api/videos/save', { method: 'POST', body: { ...v, pillar: null } });
      toast(`Saved "${saved.title}" to library`);
      state.selectedVideoId = saved.id;
      renderResearch();
    } catch (err) { toast(`Save failed: ${err.message}`); }
  }));
}

async function paintVideoDetail(id) {
  const out = document.getElementById('video-detail');
  if (!out) return;
  let v;
  try { v = await api(`/api/videos/${id}`); } catch { out.innerHTML = ''; return; }
  const analysis = v.analysis_json ? JSON.parse(v.analysis_json) : null;

  out.innerHTML = `
  <div class="card" style="margin-top:14px; border-color:#3e5a72">
    <div class="row between">
      <h2>${esc(v.title)}</h2>
      <div class="row">
        ${v.platform === 'youtube' && v.external_id ? `<button class="btn small" id="btn-refresh">Refresh stats</button>` : ''}
        <button class="btn small danger" id="btn-del-video">Delete</button>
        <button class="btn small ghost" id="btn-close-detail">Close</button>
      </div>
    </div>
    <p class="sub">${esc(v.channel_title || '')} · ${num(v.views)} views ${statNote(v.stats_source, v.stats_fetched_at)} · outlier ${v.outlier_score != null ? '×' + Number(v.outlier_score).toFixed(1) : 'n/a'}
      · pillar ${pillarPill(v.pillar)} <select id="detail-pillar" class="small"><option value="">change…</option><option>market</option><option>competitive</option><option>skit</option><option>other</option></select></p>

    <h3>Transcript</h3>
    ${v.transcript
      ? `<details ${analysis ? '' : 'open'}><summary>show transcript (${v.transcript.length} chars, ${esc(v.transcript_source)}, ${dateTime(v.transcript_fetched_at)})</summary>
         <p style="white-space:pre-wrap; font-size:13px">${esc(v.transcript)}</p></details>`
      : '<p class="muted">No transcript yet.</p>'}
    <div class="row" style="margin-top:6px">
      ${v.platform === 'youtube' && v.external_id ? '<button class="btn small" id="btn-fetch-transcript">Try automatic fetch</button>' : ''}
      <button class="btn small" id="btn-toggle-paste">Paste transcript</button>
    </div>
    <div id="paste-area" style="display:none; margin-top:8px">
      <textarea id="paste-transcript" rows="5" placeholder="Paste the transcript here (YouTube: ⋯ → Show transcript; TikTok: captions; or transcribe by ear)"></textarea>
      <button class="btn small primary" id="btn-save-transcript" style="margin-top:6px">Save transcript</button>
    </div>
    <div id="transcript-out"></div>

    <h3>Why it won — hook & format breakdown</h3>
    ${analysis ? renderAnalysis(analysis, v) : '<p class="muted">Not analyzed yet.</p>'}
    <div class="row" style="margin-top:6px">
      <button class="btn small primary" id="btn-analyze" ${v.transcript ? '' : 'disabled title="Needs a transcript first"'}>${analysis ? 'Re-analyze' : 'Analyze'}</button>
      ${analysis ? `<button class="btn small" id="btn-vault-hook">Save hook to Vault</button>` : ''}
    </div>
    <div id="analyze-out"></div>
  </div>`;

  document.getElementById('btn-close-detail').addEventListener('click', () => { state.selectedVideoId = null; renderResearch(); });
  document.getElementById('btn-del-video').addEventListener('click', async () => {
    if (!confirm('Delete this video from the library?')) return;
    await api(`/api/videos/${v.id}`, { method: 'DELETE' });
    state.selectedVideoId = null; renderResearch();
  });
  document.getElementById('detail-pillar').addEventListener('change', async (e) => {
    if (!e.target.value) return;
    await api(`/api/videos/${v.id}`, { method: 'PATCH', body: { pillar: e.target.value } });
    renderResearch();
  });
  document.getElementById('btn-refresh')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await api(`/api/videos/${v.id}/refresh`, { method: 'POST' }); toast('Stats refreshed from YouTube API'); renderResearch(); }
    catch (err) { document.getElementById('transcript-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`; e.target.disabled = false; }
  });
  document.getElementById('btn-toggle-paste').addEventListener('click', () => {
    const el = document.getElementById('paste-area');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btn-save-transcript').addEventListener('click', async () => {
    try {
      await api(`/api/videos/${v.id}/transcript`, { method: 'POST', body: { transcript: document.getElementById('paste-transcript').value } });
      toast('Transcript saved'); paintVideoDetail(v.id);
    } catch (err) { document.getElementById('transcript-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`; }
  });
  document.getElementById('btn-fetch-transcript')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Fetching…';
    try {
      await api(`/api/videos/${v.id}/transcript/fetch`, { method: 'POST' });
      toast('Transcript fetched from YouTube captions'); paintVideoDetail(v.id);
    } catch (err) {
      document.getElementById('transcript-out').innerHTML = `<div class="error-box">${esc(err.message)}${err.manual_path ? `\n${esc(err.manual_path)}` : ''}</div>`;
      e.target.disabled = false; e.target.textContent = 'Try automatic fetch';
    }
  });
  document.getElementById('btn-analyze').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Analyzing…';
    try { await api(`/api/videos/${v.id}/analyze`, { method: 'POST' }); toast('Analysis complete'); paintVideoDetail(v.id); }
    catch (err) {
      document.getElementById('analyze-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
      e.target.disabled = false; e.target.textContent = 'Analyze';
    }
  });
  document.getElementById('btn-vault-hook')?.addEventListener('click', async () => {
    const a = JSON.parse(v.analysis_json);
    const name = prompt('Name this Vault entry:', `${a.hook_type} hook — ${(v.title || '').slice(0, 40)}`);
    if (!name) return;
    await api('/api/vault', {
      method: 'POST',
      body: { name, kind: 'hook', content: a.reusable_template || a.hook_quote, notes: `Original: "${a.hook_quote}" (${a.hook_type})`, source_video_id: v.id },
    });
    toast(`Saved to Vault: "${name}"`);
  });
}

function renderAnalysis(a, v) {
  return `<div class="analysis">
    <div><strong>Hook</strong> <span class="pill">${esc(a.hook_type)}</span></div>
    <blockquote>"${esc(a.hook_quote)}"</blockquote>
    <div><strong>Format:</strong> ${esc(a.format)}</div>
    <div style="margin-top:8px"><strong>Structure</strong>
      ${(a.structure || []).map((s) => `<div class="beat"><span class="beat-name">${esc(s.beat)}:</span> <span class="beat-evidence">"${esc(s.evidence)}"</span></div>`).join('')}
    </div>
    <div style="margin-top:8px"><strong>Why it worked (checkable claims)</strong>
      <ul>${(a.why_it_works || []).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    </div>
    <div><strong>Reusable template:</strong> <em>${esc(a.reusable_template)}</em></div>
    <p class="stat-note" style="margin:8px 0 0">analysis engine: ${esc(v.analysis_source)} · ${dateTime(v.analysis_at)}</p>
  </div>`;
}

// =============================================================
// VAULT TAB
// =============================================================
async function renderVault() {
  const entries = await api('/api/vault');
  view.innerHTML = `
  <div class="grid">
    <div class="card">
      <h2>Add to Vault</h2>
      <p class="sub">A named, reusable hook / format / style. Vault entries feed the script workspace.</p>
      <div class="row">
        <input id="vault-name" placeholder="name" style="min-width:180px" />
        <select id="vault-kind"><option>hook</option><option>format</option><option>style</option></select>
        <input id="vault-content" placeholder='content, e.g. "I just found out [card] is worth [price]"' style="flex:1; min-width:260px" />
        <button class="btn primary" id="btn-vault-add">Add</button>
      </div>
      <div id="vault-out"></div>
    </div>
    <div class="card">
      <h2>Vault <span class="muted">(${entries.length})</span></h2>
      <p class="sub">"vs baseline" = average of (views ÷ your median views) across your posted videos that used the entry — it shows which templates earn their keep.</p>
      ${entries.length ? `<table><thead><tr><th>name</th><th>kind</th><th>content</th><th>from</th><th>used</th><th>vs baseline</th><th></th></tr></thead><tbody>
      ${entries.map((e) => `<tr>
        <td>${esc(e.name)}</td><td><span class="pill">${esc(e.kind)}</span></td>
        <td style="max-width:340px">${esc(e.content)}${e.notes ? `<br><span class="stat-note">${esc(e.notes)}</span>` : ''}</td>
        <td>${e.source_video_title ? `${e.source_video_url ? `<a href="${esc(e.source_video_url)}" target="_blank">` : ''}${esc(e.source_video_title.slice(0, 30))}${e.source_video_url ? '</a>' : ''}` : '<span class="muted">manual</span>'}</td>
        <td class="mono">${e.used_in}×</td>
        <td>${e.avg_vs_baseline != null ? `<span class="outlier ${e.avg_vs_baseline >= 1 ? 'warm' : ''}">×${e.avg_vs_baseline.toFixed(2)}</span>` : '<span class="muted">—</span>'}</td>
        <td class="row"><button class="btn small" data-edit="${e.id}">Edit</button><button class="btn small danger" data-del="${e.id}">Delete</button></td>
      </tr>`).join('')}</tbody></table>` : '<div class="empty">Vault is empty. Save hooks from analyzed videos in Research, or add one manually above.</div>'}
    </div>
  </div>`;

  document.getElementById('btn-vault-add').addEventListener('click', async () => {
    try {
      await api('/api/vault', {
        method: 'POST',
        body: {
          name: document.getElementById('vault-name').value.trim(),
          kind: document.getElementById('vault-kind').value,
          content: document.getElementById('vault-content').value.trim(),
        },
      });
      renderVault();
    } catch (err) { document.getElementById('vault-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`; }
  });
  view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this Vault entry?')) return;
    await api(`/api/vault/${b.dataset.del}`, { method: 'DELETE' });
    renderVault();
  }));
  view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
    const e = entries.find((x) => x.id === Number(b.dataset.edit));
    const name = prompt('Name:', e.name); if (name == null) return;
    const content = prompt('Content:', e.content); if (content == null) return;
    await api(`/api/vault/${e.id}`, { method: 'PATCH', body: { name, content } });
    renderVault();
  }));
}

// =============================================================
// SCRIPTS TAB
// =============================================================
async function renderScripts() {
  const scripts = await api('/api/scripts');
  view.innerHTML = `
  <div class="grid">
    <div class="card">
      <h2>New script</h2>
      <div class="row">
        <input id="script-title" placeholder="title, e.g. Is the new set worth buying sealed?" style="flex:1; min-width:260px" />
        ${pillarSelect('script-pillar', 'market')}
        <button class="btn primary" id="btn-script-new">Create</button>
      </div>
      <div id="scripts-out"></div>
    </div>
    <div class="card">
      <h2>Drafts <span class="muted">(${scripts.length})</span></h2>
      ${scripts.length ? `<table><thead><tr><th>title</th><th>pillar</th><th>status</th><th>engine</th><th>updated</th><th></th></tr></thead><tbody>
      ${scripts.map((s) => `<tr class="clickable ${s.id === state.selectedScriptId ? 'selected' : ''}" data-script="${s.id}">
        <td>${esc(s.title)}</td><td>${pillarPill(s.pillar)}</td>
        <td><span class="pill">${esc(s.status)}</span></td>
        <td class="muted">${esc(s.generation_source || '—')}</td>
        <td class="muted">${dateTime(s.updated_at)}</td>
        <td><button class="btn small danger" data-del-script="${s.id}">Delete</button></td>
      </tr>`).join('')}</tbody></table>` : '<div class="empty">No scripts yet.</div>'}
    </div>
    <div id="script-workspace"></div>
  </div>`;

  document.getElementById('btn-script-new').addEventListener('click', async () => {
    try {
      const title = document.getElementById('script-title').value.trim();
      const s = await api('/api/scripts', { method: 'POST', body: { title, idea: title, pillar: document.getElementById('script-pillar').value } });
      state.selectedScriptId = s.id;
      renderScripts();
    } catch (err) { document.getElementById('scripts-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`; }
  });
  view.querySelectorAll('tr[data-script]').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    state.selectedScriptId = Number(tr.dataset.script);
    renderScripts();
  }));
  view.querySelectorAll('[data-del-script]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this script?')) return;
    await api(`/api/scripts/${b.dataset.delScript}`, { method: 'DELETE' });
    if (state.selectedScriptId === Number(b.dataset.delScript)) state.selectedScriptId = null;
    renderScripts();
  }));

  if (state.selectedScriptId) paintScriptWorkspace(state.selectedScriptId);
}

async function paintScriptWorkspace(id) {
  const out = document.getElementById('script-workspace');
  let s, ctx;
  try {
    [s, ctx] = await Promise.all([api(`/api/scripts/${id}`), api(`/api/scripts/${id}/context`)]);
  } catch { out.innerHTML = ''; return; }
  const chosenVault = JSON.parse(s.vault_entry_ids || '[]');
  const chosenVideos = JSON.parse(s.research_video_ids || '[]');
  const claudeOn = state.status?.integrations?.claude?.configured;

  out.innerHTML = `
  <div class="card" style="border-color:#3e5a72">
    <div class="row between">
      <h2>${esc(s.title)}</h2>
      <div class="row">
        <select id="ws-status"><option ${s.status === 'draft' ? 'selected' : ''}>draft</option><option ${s.status === 'final' ? 'selected' : ''}>final</option></select>
        <button class="btn small ghost" id="btn-ws-close">Close</button>
      </div>
    </div>
    <p class="sub">Your performance so far: ${ctx.performance.count
      ? `median ${num(ctx.performance.baseline_views)} views over ${ctx.performance.count} posted videos (self-reported) · best pillar: ${esc(ctx.performance.best_pillar)}`
      : 'no posted videos logged yet — log them in My Videos to close the loop.'}</p>
    <div class="grid cols-2">
      <div>
        <div class="field"><label>Idea</label><textarea id="ws-idea" rows="2">${esc(s.idea || '')}</textarea></div>
        <h3>Vault templates to draw on</h3>
        ${ctx.vault.length ? `<div class="checkbox-list">${ctx.vault.map((v) => `
          <label><input type="checkbox" data-vault-check="${v.id}" ${chosenVault.includes(v.id) ? 'checked' : ''}/>
          <span><strong>${esc(v.name)}</strong> <span class="pill">${esc(v.kind)}</span><br><span class="muted">${esc(v.content)}</span></span></label>`).join('')}</div>`
        : '<div class="empty">Vault is empty — save a hook from an analyzed video first.</div>'}
        <h3>Research to draw on ${s.pillar ? `<span class="muted">(${esc(s.pillar)} first)</span>` : ''}</h3>
        ${ctx.videos.length ? `<div class="checkbox-list">${ctx.videos.map((v) => `
          <label><input type="checkbox" data-video-check="${v.id}" ${chosenVideos.includes(v.id) ? 'checked' : ''}/>
          <span>${esc(v.title)} <span class="muted mono">${num(v.views)} views${v.outlier_score != null ? `, ×${Number(v.outlier_score).toFixed(1)}` : ''}</span></span></label>`).join('')}</div>`
        : '<div class="empty">No research saved yet.</div>'}
        <div class="row" style="margin-top:10px">
          <button class="btn primary" id="btn-ws-generate">${claudeOn ? 'Draft with Claude' : 'Build template scaffold'}</button>
          <span class="muted" style="font-size:12px">${claudeOn ? '' : 'Claude not configured — this produces an honest fill-in scaffold, not an AI draft.'}</span>
        </div>
        <div id="ws-out"></div>
      </div>
      <div>
        <div class="field"><label>Script ${s.generation_source ? `<span class="stat-note">(engine: ${esc(s.generation_source)})</span>` : ''}</label>
          <textarea id="ws-content" rows="22">${esc(s.content || '')}</textarea></div>
        <button class="btn primary" id="btn-ws-save">Save</button>
      </div>
    </div>
  </div>`;

  const collectSelections = () => ({
    vault_entry_ids: [...out.querySelectorAll('[data-vault-check]:checked')].map((c) => Number(c.dataset.vaultCheck)),
    research_video_ids: [...out.querySelectorAll('[data-video-check]:checked')].map((c) => Number(c.dataset.videoCheck)),
  });

  document.getElementById('btn-ws-close').addEventListener('click', () => { state.selectedScriptId = null; renderScripts(); });
  document.getElementById('btn-ws-save').addEventListener('click', async () => {
    await api(`/api/scripts/${s.id}`, {
      method: 'PATCH',
      body: {
        idea: document.getElementById('ws-idea').value,
        content: document.getElementById('ws-content').value,
        status: document.getElementById('ws-status').value,
        ...collectSelections(),
      },
    });
    toast('Script saved'); renderScripts();
  });
  document.getElementById('btn-ws-generate').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Working…';
    try {
      await api(`/api/scripts/${s.id}`, { method: 'PATCH', body: { idea: document.getElementById('ws-idea').value, ...collectSelections() } });
      await api(`/api/scripts/${s.id}/generate`, { method: 'POST', body: collectSelections() });
      toast('Draft ready'); paintScriptWorkspace(s.id);
    } catch (err) {
      document.getElementById('ws-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
      e.target.disabled = false; e.target.textContent = claudeOn ? 'Draft with Claude' : 'Build template scaffold';
    }
  });
}

// =============================================================
// MY VIDEOS TAB
// =============================================================
async function renderMine() {
  const [{ summary, videos }, scripts, vault] = await Promise.all([
    api('/api/myvideos'), api('/api/scripts'), api('/api/vault'),
  ]);
  view.innerHTML = `
  <div class="grid">
    <div class="card">
      <h2>Your baseline</h2>
      ${summary.count
        ? `<p class="sub">Median <strong>${num(summary.baseline_views)}</strong> views across <strong>${summary.count}</strong> videos · best pillar: <strong>${esc(summary.best_pillar || '—')}</strong> · ${esc(summary.source)}</p>`
        : '<p class="sub">No videos logged yet. Your baseline (median views) appears after your first entries — every stat here is self-reported, labeled manual.</p>'}
    </div>
    <div class="card">
      <h2>Log a posted video</h2>
      <div class="grid cols-2">
        <div>
          <div class="field"><label>Title *</label><input id="my-title" style="width:100%" /></div>
          <div class="field"><label>URL</label><input id="my-url" style="width:100%" /></div>
          <div class="row">
            <div class="field"><label>Platform</label><select id="my-platform"><option>youtube</option><option>tiktok</option><option>instagram</option></select></div>
            <div class="field"><label>Posted on</label><input id="my-posted" type="date" /></div>
            <div class="field"><label>Pillar</label>${pillarSelect('my-pillar', 'market')}</div>
          </div>
          <div class="row">
            <div class="field"><label>Views *</label><input id="my-views" type="number" min="0" style="width:110px" /></div>
            <div class="field"><label>Likes</label><input id="my-likes" type="number" min="0" style="width:100px" /></div>
            <div class="field"><label>Comments</label><input id="my-comments" type="number" min="0" style="width:100px" /></div>
            <div class="field"><label>Retention %</label><input id="my-retention" type="number" min="0" max="100" style="width:100px" /></div>
          </div>
        </div>
        <div>
          <div class="field"><label>Came from script</label>
            <select id="my-script"><option value="">(none)</option>${scripts.map((s) => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select></div>
          <div class="field"><label>Vault entries used (drives the "earning their keep" stat)</label>
            ${vault.length ? `<div class="checkbox-list" style="max-height:140px">${vault.map((v) => `<label><input type="checkbox" data-my-vault="${v.id}"/><span>${esc(v.name)}</span></label>`).join('')}</div>` : '<p class="muted">Vault empty.</p>'}</div>
          <div class="field"><label>Notes</label><input id="my-notes" style="width:100%" /></div>
          <button class="btn primary" id="btn-my-add">Log video</button>
        </div>
      </div>
      <div id="my-out"></div>
    </div>
    <div class="card">
      <h2>Posted videos <span class="muted">(${videos.length})</span></h2>
      ${videos.length ? `<table><thead><tr><th>title</th><th>pillar</th><th>views</th><th>vs your baseline</th><th>retention</th><th>script</th><th>posted</th><th></th></tr></thead><tbody>
      ${videos.map((m) => {
        const ratio = m.vs_baseline;
        const pct = ratio == null ? 0 : Math.min(100, ratio * 50);
        return `<tr>
          <td>${esc(m.title)}${m.url ? ` <a href="${esc(m.url)}" target="_blank">↗</a>` : ''}<br><span class="stat-note">source: manual (self-reported) · entered ${dateTime(m.stats_entered_at)}</span></td>
          <td>${pillarPill(m.pillar)}</td>
          <td class="mono">${num(m.views)}</td>
          <td>${ratio != null ? `<div class="baseline-bar" title="×${ratio.toFixed(2)} of your median"><div class="fill ${ratio >= 1 ? 'above' : 'below'}" style="width:${pct}%"></div></div><span class="stat-note">×${ratio.toFixed(2)}</span>` : '<span class="muted">—</span>'}</td>
          <td class="mono">${m.retention_pct != null ? m.retention_pct + '%' : '—'}</td>
          <td>${m.script_title ? esc(m.script_title) : '<span class="muted">—</span>'}</td>
          <td class="muted">${dateShort(m.posted_at)}</td>
          <td><button class="btn small danger" data-del-mine="${m.id}">Delete</button></td>
        </tr>`;
      }).join('')}</tbody></table>` : '<div class="empty">Nothing logged yet.</div>'}
    </div>
  </div>`;

  document.getElementById('btn-my-add').addEventListener('click', async () => {
    try {
      await api('/api/myvideos', {
        method: 'POST',
        body: {
          title: document.getElementById('my-title').value.trim(),
          url: document.getElementById('my-url').value.trim() || null,
          platform: document.getElementById('my-platform').value,
          posted_at: document.getElementById('my-posted').value || null,
          pillar: document.getElementById('my-pillar').value,
          views: document.getElementById('my-views').value,
          likes: document.getElementById('my-likes').value,
          comments: document.getElementById('my-comments').value,
          retention_pct: document.getElementById('my-retention').value,
          script_id: document.getElementById('my-script').value || null,
          vault_entry_ids: [...view.querySelectorAll('[data-my-vault]:checked')].map((c) => Number(c.dataset.myVault)),
          notes: document.getElementById('my-notes').value.trim() || null,
        },
      });
      toast('Video logged'); renderMine();
    } catch (err) { document.getElementById('my-out').innerHTML = `<div class="error-box">${esc(err.message)}</div>`; }
  });
  view.querySelectorAll('[data-del-mine]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this entry?')) return;
    await api(`/api/myvideos/${b.dataset.delMine}`, { method: 'DELETE' });
    renderMine();
  }));
}

// ---------- boot ----------
(async function boot() {
  try {
    state.status = await api('/api/status');
    renderBanner();
  } catch (err) {
    document.getElementById('integration-banner').innerHTML = `<div class="error-box">Cannot reach the server: ${esc(err.message)}</div>`;
  }
  render();
})();
