# Evidence Standard — pre-registered before gathering

*Written 2026-07-14, BEFORE any niche-map research was gathered, per RIFT-DESK-PROMPT.md
("before you gather, write down the evidence standard… You don't get to lower the
standard once you've seen how hard it is"). Any later edit to this file may only RAISE a
bar, never lower one. A fresh reviewer attacks both compliance with this standard and
the standard itself.*

## 1. What counts as a "top creator" (per platform, per game)

An account qualifies as a **top creator** for a game on a platform only if BOTH hold:

**(a) Scale evidence.** At least one of, in descending order of strength — the strongest
available tier must be used; a lower tier is acceptable only when every higher tier is
gated/unavailable for that platform, and the map must say so:
1. Publicly visible follower/subscriber count AND typical per-video view counts, read
   directly from the platform page, recorded with URL + retrieval date.
2. A third-party stats tracker (e.g. Social Blade or equivalent) reporting counts for
   the account, with URL.
3. Platform-visible engagement proxies (likes/comments on recent posts) when view
   counts are gated, recorded with URL.

**(b) Independent corroboration.** Named as a notable/leading creator for that game by
at least TWO independent sources of different types (e.g. subreddit threads, meta sites,
tournament coverage, official preview-partner credits, press/newsletters, other
creators). Two posts by the same person/community count as one source. Official preview
partnership with the publisher counts as one strong source on its own.

An account meeting (a) but not (b), or vice versa, may appear on the map only tagged
`[CANDIDATE — standard not fully met]` and may not anchor a REMIX script.

"Top" is comparative: the map must list, per platform, the accounts found via at least
three different discovery routes (platform search, community references, aggregator/meta
sites), and the ranked shortlist must be defensible against every other account
discovered — i.e., no discovered account with clearly larger scale evidence may be
silently omitted.

## 2. What counts as a creator's "top post" (overperformance is against THEIR baseline)

A post counts as an **overperformer** only if:
- Its view count (or, where views are hidden, its like count) is at least **3× the
  median** of that same account's recent posts, established by recording metrics for at
  least 5 other posts from the same account in the same rough period, with URLs; OR
- An independent source specifically cites the post's outsized performance (with URL).

If per-post metrics are fully hidden and no proxy or citation exists, the post may be
discussed but must wear `[UNVERIFIED — performance not confirmable]` and cannot be the
skeleton for a REMIX.

Raw view count alone ("it has 1M views") does NOT qualify a post as an overperformer for
a big channel — the comparison to the creator's own median is mandatory.

## 3. Calendar events (next 60 days)

Every dated event must trace to an official publisher/organizer source, or to two
independent secondary sources, each with URL + retrieval date. No event inside the next
14 days may be missing for: Riftbound (mandatory), plus each adjacent game the map
covers (Pokémon TCG, One Piece TCG, Lorcana, MTG, Star Wars Unlimited). Dates that
conflict across sources are shown as conflicts, not resolved by preference.

## 4. Universal rules

- Every claim carries a source URL + retrieval date, or wears `[UNVERIFIED]`.
- A search-result snippet quoting a page verbatim counts as reading that page at
  second hand: acceptable, but must be marked "(snippet)" and is weaker than a fetch.
- Anything supplied by the operator or by prior-session documents (including
  RIFT-DESK-HANDOFF.md §9) is a LEAD, not a fact, until independently re-verified.
- Platform lockouts are recorded explicitly in the map ("what I couldn't see"), never
  papered over.

## 5. Raised after review pass 1 (2026-07-14) — bars may only go UP

A fresh adversarial reviewer attacked this standard and found exploitable holes. Each
fix below RAISES a bar (permitted); nothing below relaxes anything above.

1. **Scale evidence must be game-specific.** Channel-wide follower/viewer counts alone
   do not establish "top creator for game X." They must be accompanied by evidence of
   the game's share of the account's recent output (per-game streamed hours, a
   dedicated channel, or explicit game-focused branding corroborated by others) — or
   the account is a `[CANDIDATE]`, full stop.
2. **"Different types" corroboration is enforced.** Two stats trackers are the same
   type — and trackers are scale evidence, not corroboration. A corroborating source
   must actually *name* the account as a notable creator **for this game**. Every ✔
   must cite its sources; an uncited ✔ is a ✘.
3. **CANDIDATEs may not hold ranked positions.** Rankings contain only accounts that
   fully meet the standard; candidates live in a separate list with their exact
   failure named. An empty "meets standard" list is an acceptable and honest outcome.
4. **Full URLs, not domains.** Every claim cites the specific page URL. A claim with
   only a domain is treated as `[UNVERIFIED]` until re-traced.
5. **Discovery routes are documented** per platform (which searches/routes surfaced
   which accounts), so the ≥3-routes rule is auditable.
6. **Geographic/language scope must be declared.** For a game with a major
   non-English market (Riftbound: China), the map either covers that market's
   platforms or states plainly that its "top creator" claims are scoped to
   Western/English platforms only.

## 6. Raised after review pass 2 (2026-07-14) — bars may only go UP

1. **"Naming" is defined.** A §5.2 corroboration must be an independent *editorial or
   community act of naming* the account as a notable creator for this game — an
   article, a community thread, an official credit/partner roster, a wiki. Never:
   machine-generated ecosystem records (deck databases, tournament decklist pages,
   tracker leaderboards), never content authored by the account itself (bios, own
   posts), never a mis-cited URL (a wrong citation is a ✘, and worse than none).
2. **Verified-standing ≠ top-by-audience, and the map must show both.** A
   "meets the standard" list may never be presented alone as "the top creators."
   The map must surface the largest-audience accounts producing the game's content
   (even as CANDIDATEs) alongside any verified list, so "top" reflects audience
   reality, not just documentability.
3. **At least one non-snippet or official-page source per ranked entry.** An account
   whose entire entry rests on search-snippet paraphrases cannot appear in a
   "meets the standard" list.
4. **The publisher's official news/events index must be swept** (snippet-grade
   retrieval acceptable) before any N-day window is declared complete.
5. **Calendar scope must be declared** separately from creator scope. If the calendar
   is global in practice, it is global in obligation — regional launches (e.g. Korea)
   inside the window may not be missing.

## 7. Raised after review pass 3 (2026-07-14) — bars may only go UP

1. **Third-party events require the organizer's own dates.** For any event the
   publisher merely appears at (MSI, EVO, SDCC, Gen Con, PAX), the event organizer's
   own calendar is a mandatory second source. An event sourced only from a publisher
   promo page is capped at MED confidence and must be flagged as un-cross-checked.
2. **"Upcoming" framing must be validated against today's date.** A snippet of a
   promo page cannot reveal its publish date; any "upcoming events" page is treated
   as potentially stale until each entry is checked against the present.
3. **Review-pass additions face the same verification as original claims.** Anything
   a gap-closing pass adds to the deliverable must be spot-checked with the same
   rigor as first-draft claims before the next review; a reviewer's instruction is a
   lead, not a fact.
