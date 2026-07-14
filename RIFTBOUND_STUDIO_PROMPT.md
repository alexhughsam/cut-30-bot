# Riftbound Studio — build me the app

## The goal

Build me a working piece of software: a content-creation studio for TCG short-form
creators, tuned for **Riftbound** (Riot's League of Legends TCG) first and generic TCGs
second. It merges what two existing products do into one workflow:

- **Poncho AI** (tryponcho.com): given a niche, it finds the top-performing viral videos
  in that niche and can transcribe any of them, so a creator can study what's already
  winning before they write a word.
- **Sandcastles AI** (sandcastles.ai): a pre-production studio — it analyzes the hooks,
  formats, and storytelling of viral short-form videos, spots "viral outliers" (videos
  that wildly outperform their channel's baseline), keeps watchlists of channels, lets you
  save winning hooks and styles into a reusable **Vault**, gives you performance data on
  videos so you can compare them, and walks you from idea → research → hook → style →
  finished script.

I want the whole loop in one tool: **research what's winning → understand why it won →
write my script from that evidence → post → measure my own video against my baseline →
feed what I learn back into the next script.** Every video I make should start from data,
not a blank page.

I'm not going to hand you a spec or a stack. Figure out the best way to build it. If you
see a better shape for this product than what I've described, take it — but the loop
above must survive.

## Who it's for and what I make

Me, first: a solo Riftbound creator posting short-form (TikTok / YouTube Shorts / IG
Reels). My content pillars, in priority order:

1. **Investing / market content** — card prices, sealed product, spikes, "what to buy,"
   market reads.
2. **Competitive play** — decks, meta, tournament results, tech choices, gameplay takes.
3. **Skits** — maybe. Support the pillar, don't build the app around it.

The niche should be configurable (any TCG, or any category), but Riftbound is the default
and the thing it must be *great* at. That means the app knows the difference between a
market video and a gameplay video, and its research and script help are fluent in how TCG
content actually works — not generic "creator tips."

## What it has to do

Treat these as the capabilities the product must have, not a UI layout:

- **Find what's winning.** Given my niche (default: Riftbound, with my pillars as
  sub-niches), surface the top-performing short-form videos across the platforms you can
  actually reach, ranked with an **outlier score** — how far a video outperformed its own
  channel's baseline — not just raw views. Let me keep watchlists of channels/creators and
  see their numbers over time.
- **Explain why it won.** For any video (found by the app or pasted in by me): transcribe
  it, pull out the hook (the opening line *and* what's on screen), name the format and
  storytelling structure, and give me an honest read on why it performed — tied to what's
  actually in the video, not horoscope analysis that fits any clip.
- **Bank it.** A Vault where a hook, format, or style I like becomes a reusable, named
  template I can pull into future scripts. The Vault is mine and it persists.
- **Write with me.** A script workspace that takes me from a rough idea to a finished
  short-form script, drawing on the research and my Vault — so a script for a "Riftbound
  box opening is it worth it" video starts from hooks that actually worked in this niche.
  Scripts save as drafts and stay attached to the video they eventually become.
- **Score my videos.** Let me record my own posted videos and their numbers (views,
  retention if I have it, likes/comments, date, platform, which script it came from),
  compute my baseline, and show me each video against it — and against each other — so I
  can see which hooks and pillars are working *for me*, not just for the niche.
- **Close the loop.** When I start a new script, the app should already know what my last
  videos did and what Vault entries are earning their keep.

## House rules — never break these

- **Never fabricate data.** No invented view counts, no synthesized transcripts, no
  made-up card prices, no demo numbers dressed as real ones. Every metric in the UI says
  where it came from and when it was fetched. If a platform or data source can't be
  reached, the app says so plainly and gives me a manual path (paste a URL, paste stats,
  upload a transcript) — an honest manual fallback beats a fake automatic one.
- **Be straight with me about platform access.** TikTok and Instagram are hard to read
  programmatically; YouTube has a real API. Build on what you can genuinely reach with
  the keys and tools available, tell me exactly what each platform integration can and
  can't do, and design the manual-import path as a first-class feature, not an apology.
- **Riftbound facts are facts.** Card names, sets, and prices either come from a real
  source (named in the UI) or don't appear. A market-content tool that hallucinates
  prices is worse than no tool.
- **Analysis must be falsifiable.** "Great hook, strong energy" is banned. A hook
  breakdown quotes the actual opening words, describes the actual first frame, and makes
  claims someone could check against the video.
- **My data persists.** Vault, watchlists, scripts, my video stats — durable storage,
  survives restarts, exportable. Losing my Vault is losing the product.
- **Secrets stay out of the code.** API keys via environment/config, never committed.

## Before you build — the one time you get to ask

This is a big, lasting build, so plan it first and bring me every question you're
genuinely unsure about **in one batch** before you start: which API keys I can get you,
which platform matters most to me first, where this should run (my machine vs. hosted),
and anything else that changes the architecture. Once we've settled that, build — don't
come back to ask permission for things you can decide.

## The bar for "done" — checkable from the running app, not the code

Ship something I can start with one documented command. Then this walkthrough has to
actually work, end to end, on real data:

1. I open the app with the niche set to Riftbound. I see real videos from at least one
   platform, ranked by outlier score, each showing real numbers with source and fetch
   date. Filtering by my pillars (market / competitive / skits) changes the list
   sensibly.
2. I pick one video (or paste in a URL the app couldn't find on its own). I get its
   transcript and a hook/format breakdown that quotes the real opening line. I hit "save
   to Vault" and the hook shows up there as a named, reusable template.
3. I start a script: "is the new Riftbound set worth buying sealed?" The workspace pulls
   relevant research and offers Vault hooks; the finished script's opening visibly
   descends from a real Vault entry or a real researched video, and it reads like a
   30–60s short — hook first, no fluff.
4. I log two of my own posted videos with their stats. The app shows my baseline and each
   video against it, and connects one of them back to the script it came from.
5. I restart the app. Everything from steps 2–4 is still there.
6. Anywhere live data wasn't available, the UI told me so honestly and the manual path
   worked instead.

No dead buttons, no features that exist only in the README, no empty states that
pretend to be loading forever. A smaller app where every screen is real beats a bigger
one that's half façade.

## Who grades it

Whatever built it doesn't get to grade it. Before you show me anything, spin up a fresh
reviewer with a clean context and the walkthrough above, and have it actually run the
app and try to break each step — including the honesty rules (hunt for any number the
app can't source). If it finds a gap, close the gap or show me the objection verbatim;
don't reinterpret it away. Loop until a fresh reviewer passes the full walkthrough, or
you've made 5 passes — then show me what survived plus the last objection, and I'll
call it.

## Start

Start with the plan and your one batch of questions. Then build.
