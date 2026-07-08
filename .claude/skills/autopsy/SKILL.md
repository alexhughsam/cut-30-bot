---
name: autopsy
description: After-post flow for the Cut30 Coach — honest evidence-pinned autopsy of a posted video, blind-reviewed and then loop-reviewed by fresh agents, ending in the single biggest lever and the one change to test next.
---

# /autopsy — after they post

Input: the video's material (see "what you can actually assess"), the numbers, the
comments.

## Preconditions

Read all four `coach/` files. Playbook, profile, or swipe file missing/UNBUILT → blocker:
say so, check `git log --all -- coach/` for recoverable state before ever rebuilding, and
run `/setup` only for what git can't recover.

**Baseline is required.** The creator's usual views, typical retention, where people
usually drop. If it's not in `coach/profile.md` and not provided, ask for it — this is
the one place asking is mandatory, because a lever called without a baseline is a guess.
Ask for the baseline alone, not a questionnaire. When the creator supplies it, write it
into `coach/profile.md` so it is never re-asked.

**What you can actually assess.** You cannot watch a video file — don't pretend to.
Workable material, best to worst: transcript + retention-graph screenshot (readable as an
image) + key frames as images; transcript + numbers; transcript alone. When the creator
sends a video file or link, say so and ask for the closest workable substitute. Whatever
you get, state up front which levers the material can't support (delivery, pacing, cuts,
visual hook if no frames) and diagnose only what it can. Never invent visual evidence.

## 1. Close the loop from last time

Open by checking `coach/history.md`: was the single change from the last autopsy tested
in this video, and what did it do to the metric? Say so first. If a recurring weakness is
repeating, name it.

## 2. Blind lever call first (never anchor the reviewer)

Before composing anything, spawn the `autopsy-reviewer` agent in blind mode with **only**
the raw material — transcript, numbers, comments, and baseline inline in its prompt;
retention screenshots and key frames as image file paths for it to Read itself. Never
transcribe your own reading of a retention graph into its prompt — the original image is
the evidence, your reading of it is an anchor. Never your pick, never your notes, never
the rest of `coach/`. It names the single biggest lever from scratch, pinned to evidence.

Then compare with your own read:

- You agree → that's the lever.
- The blind reviewer names a different lever it ties to the evidence → **its call
  stands.** You don't get to rule that yours "ties harder" — the writer doesn't decide
  the verdict. If you genuinely believe the reviewer is wrong, adopt its lever for the
  autopsy anyway or present both calls to the creator verbatim and let them rule. Never
  silently override.
- The data can't separate two candidate levers → the diagnosis is uncertain; give both.
  Never fake a single answer.

## 3. Compose, then loop the composed autopsy (writer never grades)

Write the full autopsy. Then it gets graded like everything else:

1. Spawn a fresh `autopsy-reviewer` in grading mode with the same raw material (images
   as file paths), the four `coach/` memory files, **and** the composed autopsy,
   instructed to prove it isn't done against the bar below.
2. Close the gap it ranks biggest, go again with a new fresh instance.
3. Stop when **two consecutive fresh reviewers** find no gap that would change what the
   creator does next, or at **5 passes**. At the cap, deliver the surviving version plus
   the last objection verbatim. Only show what survived.

## The bar (from PROMPT.md)

- The biggest lever is pinned to real evidence in the material — a retention drop at a
  named timestamp, a hook failing at a quotable line, a comment pattern — not an
  unprovable "this would've mattered most."
- Numbers are read against *this creator's* baseline, not platform folklore.
- An autopsy may name any lever the data supports — topic, audience fit, offer, format,
  timing — don't force a distribution problem into a hook-and-retention frame.
- Uncertainty between levers is stated, not smoothed over.

## Deliver

1. **Last time's bet** — tested or not, and what it did.
2. **The autopsy** — honest, dense, evidence-pinned.
3. **The one biggest lever** (or the two the data can't separate, flagged uncertain).
4. **The single change to test next** — one, not a list.

Update `coach/history.md` (this video's row + recurring-weakness read),
`coach/profile.md` (any newly learned baseline), and `coach/swipe-file.md` if something
overperformed. Commit and push per CLAUDE.md's persistence rule.
