# The Rift Desk — Handoff

*Written by the departing lead. You can never ask me anything, so this is everything:
what we're building, why every piece is shaped the way it is, how to run it, how to
change it without breaking it, and where the bodies are buried. If something here
contradicts what you'd rather do, assume I hit the failure you're about to walk into.*

---

## 1. What this is

**The Rift Desk** (`RIFT-DESK-PROMPT.md`) is a prompt, and the prompt is the product.
Paste it into a Fable session (Claude Code or any harness with web access, sub-agents,
and a persistent working directory) and you get a Poncho-style content engine
purpose-built for the TCG niche, Riftbound first.

"Poncho-style" means the workflow from the viral @camiinthisthang tweet: identify the top
creators in a niche → pull their most viewed/liked posts → transcribe the videos into
scripts → dissect why they worked → merge the strong elements with the operator's own
voice and experience. Poncho (tryponcho.com) is a general agent with pay-per-use social
data and transcription tools. We are not cloning the product; we're building the
*workflow* as a specialist agent, aimed at one niche where timing and trust matter more
than anywhere else: trading card games.

Why TCG, and why Riftbound first: new TCGs are land grabs. Riftbound (Riot's League of
Legends TCG) launched internationally in late 2025; the creator hierarchy is still
unsettled, spoiler seasons arrive every ~3 months, and early movers in a new game's first
sets capture top-creator slots cheaply — that pattern repeated in One Piece (2022),
Lorcana (2023), and Star Wars Unlimited (2024). The niche also runs on a built-in content
calendar (spoilers → release → meta settles → banlist/rotation → tournaments), which
gives the agent an endless supply of "moments" to ride.

The strategic spine — this matters more than any feature: **remixing winners is the
on-ramp, not the road.** The tweet itself says copying gets you 1M views and no further.
So the system is deliberately built to make itself less necessary: every deliverable is
tagged REMIX or ORIGINAL, performance of each is tracked, and the agent is *obligated* to
push the operator toward originals as soon as the numbers support it. If you ever find
yourself optimizing the remix pipeline while the graduation mechanic rots, you are
building the wrong product.

## 2. The philosophy (why it's a prompt, not an app)

The prompt is written under a specific doctrine for prompting Fable-class models,
preserved verbatim in this repo as `FABLE-PROMPTING-GUIDE.md` — that file is the
canonical reference for every review and rebuild described below; the summary here is
only a summary. Its principles are not style preferences — each one is load-bearing:

1. **Goal, not steps.** We never tell the agent how to find creators, rank posts, or get
   transcripts. Every step you dictate overrides the model's judgment with yours, and
   yours is worse. This is also what makes the prompt survive platform churn: no named
   tool in the workflow can break, because no tool is named.
2. **House rules, few and absolute.** A handful of lines the agent can never cross, so
   the underspecified goal stays safe.
3. **A hard, checkable bar for "done."** No adjectives. Every bar is checkable from the
   real output by a third party. Where we can't define the measurement (e.g. "top
   creator" when platforms hide numbers), we make the agent invent the measuring stick —
   and pre-register it so it can't be quietly lowered.
4. **The builder never grades.** Every deliverable is judged by a fresh-context
   sub-agent trying to prove failure, and the reviewer owns the verdict.
5. **Loop until the bar, capped.** The agent never self-declares finished; the loop
   exits on two consecutive clean fresh reviews or a pass cap with human escalation.
6. **Build on prior work.** Persisted files + reading traces of past sessions, so every
   session compounds instead of restarting.
7. **Get out of the way.** Pre-cleared budget, autonomy by default, one-question asks,
   plan-first reserved for big builds only.

Software would fossilize choices (which platform, which scraper, which ranking formula)
that the model re-derives better, fresh, every time. The only durable artifacts are the
goal, the rules, the bar, and the operator's accumulated files.

## 3. What's in the repo

| File | What it is |
|---|---|
| `RIFT-DESK-PROMPT.md` | **The product.** The prompt you hand to the agent. |
| `RIFT-DESK-HANDOFF.md` | This document. |
| `FABLE-PROMPTING-GUIDE.md` | The prompting doctrine, verbatim. Canonical for all reviews. |
| `PROMPT.md` | The Cut30 Coach — the *ancestor* prompt (short-form video coaching). Same doctrine, earlier domain. It's the craft reference: voice, density, and several mechanisms (source-tagging, blind review, capped loops) were proven there first. When writing the next prompt in this family, start by reading both it and Rift Desk. |

## 4. Load-bearing anatomy of the prompt

Read this next to `RIFT-DESK-PROMPT.md`. For each section: what it does, and what breaks
if you weaken it.

**The goal.** Names the Poncho loop as inspiration, then explicitly cedes the "how"
("I'm not going to tell you how to run it"). That sentence is the goal-not-steps
principle in action — delete it and the agent starts treating the tweet's 5 steps as a
procedure. The "remix is scaffolding" paragraph up front is what licenses the graduation
section later; the two must stay consistent.

**First, map the niche — honestly.** Two mechanisms here are the epistemic core:
- *Leads, not facts:* anything the operator (or this handoff) says about the niche is
  treated as unverified until the agent checks it. This exists because our own research
  (Section 9) was partly unverifiable and will be stale by the time anyone reads it.
  Remove this and stale briefings get laundered into scripts as facts.
- *The pre-registered measuring stick:* platform data genuinely hides (during our
  research, Twitch metrics pages and creator directories 403'd; TikTok stats are gated).
  So the agent writes its own evidence standard for "top creator / top post" **before
  gathering**, may not lower it afterward, and a fresh reviewer attacks both the evidence
  *and the standard itself*. The anti-ratchet lock came from the *engine* draft and the
  attack-the-stick review from *creator* (see Section 5); both survived judging — keep
  both.

**Know me before you write as me.** The profile (owned cards, shootable footage,
baseline numbers) is what makes the "filmable today" house rule checkable and what makes
"my voice" mean something. One short exchange, persisted, never re-asked.

**House rules.** Five absolutes, each deliberately third-party checkable:
- *Never launder* — source or `[UNVERIFIED]` on every number. TCG content lives on
  prices and meta claims; one invented stat destroys operator credibility.
- *Steal skeletons, never sentences* — the **8-consecutive-words rule** is the
  mechanical floor (a reviewer can literally grep for it). It replaced a vague
  "near-verbatim" after judging; do not soften it back to judgment language. Verbatim
  card text, rules text, and official announcement wording are exempt — every TCG
  creator quotes those, and without the exemption the reviewer is bound to fail every
  card-reveal remix.
- *No brain-dump, no script* — the agent may never fabricate the operator's take. This
  is both an ethics line and the thing that makes the merge worth anything.
- *Mode declaration + moment pin* — REMIX/ORIGINAL stamped on every deliverable (makes
  graduation auditable per-item, not aspirational) plus calendar event + film-by date
  (a TCG script that isn't riding a moment is riding nothing; evergreen-on-purpose is
  the sanctioned exception, not a loophole to delete).
- *Filmable today* — checked against the profile. Without it, merged scripts arrive
  referencing cards the operator doesn't own. This was the single biggest
  operator-value differentiator in judging.

**The bar for "done."** Four bars (map, dissection, script, original), all checkable
from real output:
- The **fingerprint test** is the crown jewel. Blind reviewer (no brain-dump) traces
  every script line to sources; the untraceable remainder must exist and must include
  the hook, payoff, or central claim — otherwise it's "a copy wearing my name." Then a
  second, non-blind pass verifies ≥3 load-bearing lines actually came from the
  brain-dump. The two-pass order matters: blind first (originality), provenance second
  (authenticity). Collapsing them into one pass breaks the blindness.
- The dissection bar bans generic findings ("strong hook") — pin to timestamp or cut —
  and requires honest ambiguity ("give both explanations") when evidence can't decide.
- ORIGINALs get their own bar: <72h-old named event, no source transcript, and at least
  one take a reviewer *cannot find* in the mapped top creators' recent output after
  actually looking. Without that distinctness check, "original" degrades into
  restating the niche consensus without a transcript open.

**Who grades it, and the loop.** Fresh-context sub-agent, same raw material, tries to
prove failure; reviewer owns the verdict; builder cannot reinterpret or downgrade
objections. Dissections are reviewed *blind from scratch* (reviewer forms its own
why-it-worked and wins ties it can pin harder to evidence). Loop exit is external and
mechanical: two consecutive clean fresh reviews or 5 passes; only at the cap does the
operator see the survivor plus the last standing objection. The operator only ever sees
survivors. If you ever let the builder
summarize the reviewer's objection instead of showing it verbatim, the whole
verification chain is theater.

**The graduation.** The wean made operational: at least one ORIGINAL per five scripts
or per calendar week, whichever comes first; per-element attribution (which borrowed
elements move *this operator's* numbers); the comment-quote signal (are viewers quoting
borrowed lines or the operator's own — a directly observable graduation *signal*; the
shift *trigger* is originals beating remixes); a duty to chase the operator for missing
performance numbers; automatic mix-shift when originals beat remixes; and a *duty to
name a stall* if the operator lingers in remix mode. This section is the difference
between a growth system and a plagiarism treadmill. It is the last thing you may ever
cut.

**Build on everything we've already done.** Three persisted files — niche map, profile,
swipe file — read back every session; missing files are a *blocker*, not a
silently-absorbed inconvenience (silent rebuild-from-memory is how agents fake
continuity). Past session traces are explicitly fuel. The endgame sentence ("my own
library becomes the main thing we remix") is the strategic spine restated as an
operating instruction.

**Get out of the way / The daily rhythm.** $20/month pre-cleared spend (the guide's
budget principle — without it, the first paywalled data source stalls the whole run);
lockout transparency ("say exactly what you couldn't see"); one-missing-thing asks; and
a closing kickoff instruction so session one starts itself.

## 5. How it was built (reproduce this process for any successor prompt)

The prompt was not written once; it was manufactured. The process is the real IP:

1. **Research fan-out** (parallel, fresh agents): (a) what Poncho actually is and does;
   (b) current state of Riftbound; (c) the TCG creator economy across games; (d) a
   grading rubric distilled from `FABLE-PROMPTING-GUIDE.md` + the ancestor prompt.
2. **Three independent drafts**, each forced into a different angle: *engine*
   (niche-intelligence machine first), *creator* (daily filmable-output partner first),
   *edge* (the 1M→10M graduation as the organizing idea). Independent drafts explore the
   space; one draft iterated three times does not.
3. **Judge panel** (three fresh agents, three lenses: guide-fidelity, operator-value,
   craft) scoring all drafts against the rubric. Verdict: *creator* won 2–1 on the
   strength of day-one shootability, the pre-cleared budget, and the attack-the-stick
   map review; *engine* won on epistemics (8-word rule, anti-ratchet lock,
   trace-reading); *edge* lost but
   contributed the whole graduation instrumentation (mode tags, comment-quote signal,
   stall-naming, distinctness bar).
4. **Synthesis**: winner's spine + every graft at least two judges independently named.
   That consensus filter is deliberate — single-judge enthusiasms are noise.
5. **Adversarial verification**: fresh critics attack the synthesized prompt
   (spoon-feeding? unmeasurable bars? builder grading itself? stranger-ambiguity?).
   Anything confirmed gets fixed and re-attacked.

When you build the next prompt in this family (Poncho-for-fitness, for-cooking,
whatever): hand the drafting agents `FABLE-PROMPTING-GUIDE.md` as doctrine and
`PROMPT.md` *and* `RIFT-DESK-PROMPT.md` as craft references, re-run this exact pipeline,
and let the judges — not you — pick the winner.

## 6. Running it: day one, and every day

**Session zero (operator setup):**
1. Open a Fable session with web access, sub-agent support, and a persistent working
   directory the agent can read/write across sessions. Paste `RIFT-DESK-PROMPT.md` in
   full as the opening message (or install it as the system prompt).
2. **Trace-reading mechanism:** "read the traces of your own past sessions" only works
   if traces are reachable. If the harness exposes session transcripts on disk, point
   the agent at that path once; if it doesn't, the fallback is built into the workflow —
   the agent's persisted files (map, swipe file) double as its own session log. Confirm
   one or the other exists before session two.
3. **Money mechanism:** the $20/month is real spend, so it needs rails. Per the prompt,
   the agent tells you *once* what to provision (an account, an API key, a prepaid or
   virtual card capped at $20); you set it up same-day and tell it where the credentials
   live. After that it spends without asking. If you want a different number, change it
   in the prompt, not verbally.
4. The agent will build the niche map (expect it to take real time — it has to invent
   and meet an evidence standard, and a reviewer has to fail to break it) and ask for
   your profile in one exchange. Answer completely; it's persisted and never re-asked.
   On this very first session, the persisted files legitimately don't exist yet — the
   missing-files-are-a-blocker rule applies from session two onward.

**Daily:** bring nothing ("what's the play today?") or a brain-dump on a topic. You get
back: the moment, the dissection (if REMIX), and a survivor script — hook line, first
frame, shot list, film-by date. Film it, post it, and *bring the numbers back*. The
graduation mechanic is blind without your posted-video performance data.

**What the operator must never do:** accept a script that arrived without surviving
review ("just give me a quick one" defeats the entire quality chain); skip mode tags;
feed the agent performance numbers selectively (survivorship-biased swipe files
mis-teach the graduation logic).

## 7. Extending it without breaking it

Safe to change: the game list; the $20 budget; the 60-day calendar horizon; the 14-day
map-freshness bar; the 72-hour original-freshness window; the 30-day distinctness search
window; the ORIGINAL cadence (one per five scripts / per week); file names.

Default for anything on neither list below: **presumed invariant** until an edit
survives the change control at the end of this section. Don't delete a mechanism because
it isn't enumerated here.

**Invariants — change these and it is no longer this product:**
1. Goal-not-steps. Never add a tool name, platform-specific procedure, or numbered
   workflow to the prompt. If a platform dies, the prompt already survives it.
2. The builder never grades, the reviewer owns the verdict, objections surface verbatim.
3. Every bar stays checkable from real output by a third party. If you add a bar, ask:
   "could a fresh agent with only the artifacts decide this?" If not, rewrite it.
4. The 8-word mechanical floor and the blind-first/provenance-second fingerprint order.
5. Leads-not-facts + the pre-registered, non-lowerable evidence standard.
6. The graduation mechanic, whole: mode tags, the ORIGINAL cadence floor (the number is
   tunable, its existence is not), distinctness check, mix-shift duty, stall-naming duty.
7. No brain-dump, no script.

**Change control:** any edit to `RIFT-DESK-PROMPT.md` goes through the Section 5
pipeline in miniature — a fresh-context agent reads the edited prompt cold and tries to
prove it violates the doctrine or contains a bar that can't be checked; a second fresh
agent runs the stranger test (could an agent act on this with zero questions the prompt
should have settled?). Concretely: make the edit on a branch, record both reviewers'
verdicts verbatim in the commit message or PR description, and merge only after two
consecutive clean passes. Never review your own edit.

## 8. Known limits and failure modes

- **Platform lockouts are normal, not exceptional.** During our own research: 403s on
  Twitch metrics, creator directories, even tryponcho.com itself. The prompt's answer is
  the invented-stick + lockout-transparency pair. Expect the map's evidence standard to
  lean on proxies; that's fine *as long as the standard is written down and attacked*.
- **Transcription is genuinely hard without tooling.** Poncho's edge was integrated
  transcription. A bare Fable session may need a paid transcription route (that's what
  the budget is for) or will fall back to captions/descriptions — the prompt lets the
  agent choose, but week-one output quality depends on it solving this early.
- **The wean can stall silently if the operator doesn't post or doesn't report
  numbers.** The stall-naming duty covers agent-side stalling; nothing can cover an
  operator who never films. Not a prompt bug.
- **Legal/platform-ToS gray zones:** scraping gated data, re-using transcript content.
  The 8-word rule and skeletons-not-sentences keep output on the right side of
  plagiarism; data *acquisition* methods are the agent's judgment call under its budget
  — if you need a harder compliance line, add it as a sixth house rule, don't bury it
  in prose.
- **Riot's fan-project policy** — per Riot's February 2026 "State of the Game" post,
  they prohibit fan projects that automate Riftbound rules/gameplay (a lead from our
  July 2026 research; re-verify against Riot's current legal/fan-content pages before
  relying on it) — doesn't touch this product either way: we make content about the
  game, not a game client. Keep it that way.

## 9. Research snapshot (July 2026) — STALE BY DESIGN, leads only

Everything below was researched in early July 2026 and the prompt explicitly instructs
the agent to re-verify before use. Do not "fix" the prompt by injecting these as facts.

- **Poncho**: tryponcho.com, agent with ~3,000 pay-per-use tools (x402 micropayments via
  AgentCash); confirmed social-data tools for TikTok/IG/Facebook/Reddit and Deepgram
  transcription; script-merging is plain LLM work, not a product feature. Source
  workflow tweet: @camiinthisthang.
- **Riftbound**: intl. launch Oct 31 2025; sets Origins → Spiritforged (Feb '26) →
  Unleashed (May '26) → Vendetta (July 31 '26, first unified global release) → Radiance
  (Q4 '26). Standard-only constructed, 2-year rotation; no digital client; Worlds
  planned 2027. Defining story: chronic under-supply, ~$90–100 chase singles, scalping.
  Community: r/riftboundtcg, Piltover Archive Discord, riftbound.gg / mobalytics /
  riftdecks for meta. Named creators found: eMOEtional, AliEldrazi, Riftbound Report —
  but *no verifiable ranked creator leaderboard existed*; that's exactly the gap the
  agent's measuring stick has to close.
- **TCG content economy**: formats that reliably perform — pack openings/chase pulls,
  deck techs, banlist/spoiler reaction (speed beats polish), market/price calls, tier
  lists after tournaments. Breakout pattern: own a wedge, ride the calendar faster than
  incumbents, shorts-to-longform funnel, credibility moat (results, preview partnerships,
  verifiable market calls). New-game spoiler season 1 is the cheapest top-slot land grab.

## 10. Final word

The product is a loop that gets a person from imitation to a voice of their own, with
honesty rules that keep every borrowed beam labeled while they build. Every mechanism in
the prompt serves one of those two things — graduation or honesty. When in doubt about
any future decision, ask which of the two it serves. If the answer is neither, you don't need it.
