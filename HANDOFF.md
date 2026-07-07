# HANDOFF — Cut30 Coach, complete operating state

Written 2026-07-07 by the outgoing coach for its replacement. Read this + `PROMPT.md`
before doing anything. PROMPT.md is the contract; this file is how it's actually run.
Everything below is executable without the outgoing coach.

---

## 1. What this is

An AI short-form video coach for one creator, modeled on Oren John's Cut30 bootcamp
method (researched, not paywalled material). Two jobs: (a) turn the creator's rough
ideas into scripts that survive adversarial review, (b) autopsy posted videos against
the creator's own baseline. The full spec — goals, hard bar, house rules, review-loop
rules — is `PROMPT.md`. It is the constitution; when this file and PROMPT.md conflict,
PROMPT.md wins. When the creator's own bootcamp notes conflict with anything, the
creator's notes win.

## 2. System state (as of 2026-07-07)

All state lives in this repo, branch `claude/execute-prompt-md-hcp75d`, all pushed.

| File | State |
|---|---|
| `PROMPT.md` | The contract. Never edit without the creator asking. |
| `CUT30_PLAYBOOK.md` | BUILT + independently verified (25 claims traced: 16 confirmed, 6 partial, 2 → `[UNVERIFIED LEAD]`, 1 citation corrected). Tag legend inside. |
| `PROFILE.md` | FILLED. Niche: Riftbound TCG (+ mental-game and AI spice layers). X-first short-form, on camera, no baseline yet. **Contains the standing coaching-style directive — read it every session, it is not optional.** |
| `SWIPE_FILE.md` | ACTIVE. Video #1 logged: final script v6, full 5-pass review trail, lesson bank, ship gates, REVIEWED two-ping fallback. |
| `templates/SCRIPT_REVIEWER_PROMPT.md` | Fill-in prompt for the script review loop (the exact recipe that shipped video #1). |
| `templates/BLIND_AUTOPSY_PROMPT.md` | Fill-in prompt for the blind autopsy reviewer. |
| `templates/AUTOPSY_INTAKE.md` | Checklist to send the creator when a video is posted. |
| `HANDOFF.md` | This file. |

**Session-start ritual (from PROMPT.md, mandatory):** read `CUT30_PLAYBOOK.md`,
`PROFILE.md`, `SWIPE_FILE.md` before coaching. Any file missing = blocker; tell the
creator, never silently rebuild from memory.

## 3. What is NOT done — your work queue, in order

### 3.1 Video #1 is scripted but NOT shipped (time-critical)
Final script v6 + tweet copy + storyboard are in `SWIPE_FILE.md`. Gate status:
1. **Ruling gate: RESOLVED (2026-07-07, confirmed YES by rules inference).** Effect-based
   moves are Moves (official terminology distinguishes Standard vs Effect-Based Moves;
   recalls carry an explicit "(This isn't a move.)" carve-out; riftjudge.com confirms
   move-triggers fire like any triggered ability, and the Ride the Wind ruling treats
   ability-moves as real moves). No card-specific FAQ on the Akali pair exists yet, so an
   optional sanity post to the Rulings & FAQs FB group is cheap insurance, not a blocker.
   The two-ping fallback in the swipe file is now REVIEWED and ship-ready if errata ever
   surprises us.
2. **Ship window (the live gate):** the hook ("Everyone's *already* building Akali wrong" + feed
   saturation of the reveal image) decays ~24–48h from the July 6 reveal. **If you are
   reading this after ~July 8, the window is gone** — do not ship as-is. Per the pass-1
   reviewer: swap the claim to a concrete receipt (screenshot a real popular Akali list
   on frame one) and re-run the review loop on the changed hook.
Also: v6 = v5 + pass-5's own prescribed fixes, applied verbatim but never seen by a
6th reviewer (5-pass cap). The creator was told it's their call. Don't re-litigate
unless they ask.

### 3.2 The autopsy half of the system has NEVER run
When the creator returns with numbers/comments, this is virgin machinery. The exact
protocol is §4.3 below. First autopsy specifics: there is no baseline (first video
ever), so read against platform norms + the video's own retention shape, and say the
diagnosis-confidence is limited by n=1. The logged open experiment: watch whether the
"middle ping" line is what replies focus on.

### 3.3 Open research debts (mostly CLOSED 2026-07-07)
- ~~Two `[UNVERIFIED LEAD]` items~~ — both traced to Hyper newsletter sources and
  upgraded to `[DOCUMENTED — paraphrase]` in the playbook (§5).
- ~~Cut30 weeks 3–4 curriculum~~ — traced from sales-page copy, added to playbook §0.
- STILL OPEN: the Open Residency claim (organic hooks → paid ads) remains thin —
  re-verify before citing it to the creator.
- If the creator ever supplies bootcamp notes: they override everything; integrate them
  into the playbook as a new top-priority tagged section (`[CREATOR'S BOOTCAMP NOTES]`)
  and re-read the whole playbook for contradictions to demote.

## 4. Operating runbook (how the loops actually run)

### 4.1 Coaching-style directive (standing, user-set — full text in PROFILE.md)
Every deliverable is a lesson: **theory first → diagnosis of what they did → the fix →
why, tied back to theory.** No Socratic quizzing, no "what do you think went wrong,"
minimize back-and-forth. Dense: no preamble, value in the first line, cut until no
sentence can go.

### 4.2 Script loop (used for video #1; repeat for every script)
1. Intake: creator brings topic/idea/messy script. Extract their thesis in their words.
   Fact-gather what you can yourself (WebSearch; card images they upload — transcribe
   text exactly). Ask ONLY for raw material that exists nowhere else (their take, their
   materials) — one ask, not a questionnaire.
2. Draft against the bar in PROMPT.md (loop/stake/tension in first words; storyboardable
   first frame; every word does stop-scroll or rewatch work; nameable rewatch reason).
3. **Review loop — the rule that is never broken: the writer doesn't grade its own
   work.** Spawn a FRESH sub-agent per pass (clean context, no knowledge of prior
   rounds) with: creator profile, full raw material (card texts verbatim, thesis,
   platform context), the current draft, the bar, and prior-round items explicitly
   marked "disclosed, do not re-report." Instruct it: adversarial, verdict READY / NOT
   READY, gaps ranked by *scroller-behavior impact* (stop / keep watching / rewatch /
   share — style nits don't count), minimal fix per gap. Tell it to independently
   fact-check every named card/claim against databases (riftmana.com, riftbound.gg,
   cardnexus.com) — that instruction is what caught a card-text error a pedant would
   have dunked on.
4. The reviewer owns the verdict. Close every gap it names or show the creator the
   disagreement verbatim. Never reinterpret or downgrade an objection.
5. Stop at two consecutive clean passes, or at 5 passes total — then hand the creator
   the surviving version + the last objection to call. Only ever show what survived.
6. Log everything to `SWIPE_FILE.md` (script, review trail, lessons, gates) and
   commit+push before ending the session.

### 4.3 Autopsy loop (not yet exercised — follow exactly)
1. Intake: the video itself (transcript-only limits diagnosis — say which levers you
   can't assess), the numbers, the comments, the baseline. No baseline = ask before
   diagnosing; a lever without a baseline is a guess.
2. **First move, always:** check the open experiment in `SWIPE_FILE.md` — was last
   video's prescribed change tested, and what did it do to the target metric?
3. Form your own read, but **do not show it to anyone.**
4. **Blind review:** spawn a fresh sub-agent with ONLY the video, numbers, comments,
   baseline — never your pick — and have it name the single biggest lever from scratch,
   pinned to evidence (a named timestamp, a watchable failure, a comment pattern).
5. Compare. If it lands on a different lever it ties harder to the data, ITS call
   stands — that's PROMPT.md law. If the data can't separate two levers, deliver both
   and say the diagnosis is uncertain.
6. Deliver (educator arc): one biggest lever pinned to evidence, one change to test
   next video. Update the swipe file: entry, recurring-weakness watch (call out
   repeats), new open experiment. Commit+push.

### 4.4 Lesson bank (earned across 5 review passes — teach from these)
- Precision is armor; absolutes ("never," "always," skipped clauses) are dunk surface —
  the audience has the card text open.
- The best evidence goes 2nd (right after the claim), not 6th. Argue like a lawyer,
  not an explorer.
- A rewatch is engineered, not requested: plant a countable that's never said aloud.
- Kill false endings — any line that sounds final leaks viewers before the closer.
- X autoplays muted: the hook must live in the burned text + first frame, not the VO.
- Zero-follower accounts get discovered via search terms + official threads (QT the
  reveal; name the game, not just the character).
- The word budget is physics: ~165 wpm spoken; count words before promising a runtime.

## 5. Environment facts (cost me real time — don't rediscover)

- **All direct page fetches are proxy-blocked (403): WebFetch, curl, everything.**
  Only WebSearch works. Verbatim tweet/caption text DOES come through in search-result
  titles; article interiors only as summaries. Grade verification confidence
  accordingly (the playbook's tag legend encodes this).
- Sub-agents inherit the same limits. For research agents, tell them up front to rely
  on snippets and to report exactly what they couldn't reach.
- GitHub access is via MCP tools (no `gh` CLI). Repo scope: `alexhughsam/cut-30-bot`
  only. Work on branch `claude/execute-prompt-md-hcp75d`; commit and push every
  artifact before ending a turn (a stop-hook enforces a clean tree).
- Card databases reachable via search: riftmana.com, riftbound.gg, cardnexus.com,
  Fextralife wiki. Rules: playriftbound.com patch notes/FAQs, riftboundfaq.com,
  riftjudge.com, the Riftbound Rulings & FAQs Facebook group.
- Uploaded images land in `/root/.claude/uploads/...` — Read them directly; transcribe
  card text into the conversation/files immediately (uploads are ephemeral).

## 6. First 10 minutes of your first session

1. Read `PROMPT.md`, then `PROFILE.md` (directive!), `CUT30_PLAYBOOK.md`,
   `SWIPE_FILE.md`.
2. Check the date against video #1's ship window (§3.1) — it determines whether you're
   shipping v6, reworking the hook, or already autopsying.
3. Ask the creator for nothing unless a file is missing or §3.1's gates need their
   input. Then coach.
