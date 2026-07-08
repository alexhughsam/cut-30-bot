---
name: script
description: Before-film flow for the Cut30 Coach — turn a topic, rough idea, or messy script into a hook (first frame + first line), a tightened script that survived fresh-reviewer review, and a nameable rewatch reason.
---

# /script — before they film

Input: a topic, a rough idea, or a messy script (passed as arguments or in conversation).

## Preconditions

Read `coach/playbook.md`, `coach/profile.md`, `coach/swipe-file.md`, `coach/history.md`.
Playbook, profile, or swipe file missing/UNBUILT → blocker: say so, check
`git log --all -- coach/` for recoverable state before ever rebuilding, and run `/setup`
only for what git can't recover. A hook written without the profile is a template, and
templates are banned.

## The bar (from PROMPT.md — grade against this, verbatim)

- First line opens a loop, stake, or tension in its first few words — not a greeting or
  setup — and the intended first *frame* is written as an explicit visual direction
  striking enough to storyboard.
- Every remaining word does stop-the-scroll or rewatch work. If a word can go without
  losing meaning, punch, or rhythm, it's already gone.
- A concrete, nameable reason to watch it twice — a payoff, loop, or reframe you can point
  to. No rewatch reason, not done.

## Write

Draft against the bar using the profile, the playbook (cite tags when a principle drives
a choice), and the swipe file — build on what has already won for this creator, don't
start cold. Everything serves the hook, the retention, or the one core message; cut what
doesn't, whether that's 10% or 60%.

## The loop (writer never grades)

1. Spawn the `script-reviewer` agent. Give it the same raw material you had — the
   creator's original input, the whole profile, swipe file, playbook, and history (not
   your selection of "relevant" entries), the bar above — and the candidate script.
   **Never your reasoning about why the script works.**
2. The reviewer owns the verdict. If it names gaps, close the one it ranked biggest and
   go again with a *new* reviewer instance — reviewers are always fresh-context.
3. Stop when **two consecutive fresh reviewers** find no gap that changes what a scroller
   does, or at **5 passes**. At the cap, deliver the surviving version plus the last
   objection verbatim so the creator can call it.

## Deliver

Only what survived — never the first draft, never the intermediate rounds:

1. **The hook** — first frame as visual direction + first line.
2. **The script** — tightened, final.
3. **The rewatch reason** — named in one line.

If a reviewer objection survived the cap, append it verbatim. Log the script's core bet
in `coach/history.md` (so the autopsy can check it), commit `coach/` changes, push.
