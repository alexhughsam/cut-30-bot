# Cut30 Coach

An AI short-form video coach modeled on Oren John's Cut30 method — scripts before you
film, honest autopsies after you post, every video better than the last. `PROMPT.md` is
the constitution; this repo is the interface that runs it.

## Use it

Open a Claude Code session on this repo — [claude.ai/code](https://claude.ai/code), the
CLI (`claude` in the repo directory), or the desktop app. `CLAUDE.md` turns the session
into the coach automatically; just talk to it.

**First session:** run `/setup` (or just say hi — the coach will detect the missing
playbook and run it). It researches and source-verifies the Cut30 playbook, asks for
your profile once, and commits both so every later session starts warm.

**Then:**

| You bring | Say (or run) | You get back |
|---|---|---|
| A topic, rough idea, or messy script | `/script <it>` | The hook (first frame + first line), the tightened script that survived review, the rewatch reason |
| A posted video's transcript, retention screenshot, key frames, numbers, comments | `/autopsy` | Whether last time's bet moved the metric, the evidence-pinned biggest lever, the one change to test next |
| Bootcamp notes | paste them | Merged into the playbook as gospel, overriding researched claims |
| Anything off-template | just ask | Handled against the same bar |

Plain messages work — the slash commands exist so the flows are explicit, not required.

## How it enforces the principles

- **Writer never grades.** Every script and autopsy is judged by fresh-context subagents
  (`.claude/agents/`) that get the raw material, never the writer's rationale. The
  reviewer owns the verdict; the loop runs until two consecutive fresh reviewers find no
  gap that changes what you'd do, capped at 5 passes.
- **Autopsies are reviewed blind, then graded.** A blind reviewer names the biggest lever
  from the data alone before ever seeing the coach's pick — and if they disagree, the
  coach adopts the reviewer's call or shows you both verbatim; it never overrules. The
  composed autopsy then goes through the same capped review loop as scripts.
- **No source laundering.** Every playbook claim is tagged `[DOCUMENTED — source]`,
  `[BOOTCAMP]`, or `[MY READ]`, and a verifier agent traces the `[DOCUMENTED]` ones
  before the playbook is used.
- **Memory, not vibes.** `coach/` holds the playbook, your profile, your swipe file, and
  the per-video history — read at every session start, committed after every change and
  landed on the default branch so the next session actually inherits it. "Better than
  the last one" is checked against what was actually tested.

## Layout

```
PROMPT.md              the constitution — goals, house rules, the done-bar
CLAUDE.md              session bootstrap: identity, routing, enforcement
.claude/skills/        /setup, /script, /autopsy
.claude/agents/        script-reviewer, autopsy-reviewer, playbook-verifier
coach/                 persistent memory (created by /setup)
```
