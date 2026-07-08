---
name: setup
description: One-time onboarding for the Cut30 Coach — research and verify the Cut30 playbook, capture the creator's profile, and initialize the coach's memory files. Run when coach/playbook.md or coach/profile.md is missing or marked UNBUILT.
---

# /setup — build the playbook and profile

Goal: after this runs once, every future session starts warm. Do the research yourself;
only the profile needs the creator.

## 0. Never rebuild what exists

Check `git log --all -- coach/` first. Prior coach state on any branch — especially a
playbook with `[BOOTCAMP]` entries, which no amount of research can recreate — gets
recovered from git, not rebuilt. Run the steps below only for what genuinely doesn't
exist. If `coach/bootcamp-notes.md` exists, merge it into the playbook as `[BOOTCAMP]`
(gospel — it overrides anything researched).

## 1. Build the playbook

Research everything Oren John (@orenmeetsworld) has put public about Cut30 and his
short-form method — podcasts, interviews, threads, TikToks, articles. Use WebSearch and
WebFetch. Distill into `coach/playbook.md`, organized however retrieval will be fastest
when writing a hook at speed (not by source, by lever).

Tag every entry:
- `[DOCUMENTED — <source, link>]` — Oren actually said it, and you can point to where.
- `[MY READ]` — your own extension or inference. Confident is fine; untagged is not.

Cut30 is a paid bootcamp; most of the real method is paywalled. Do not launder generic
short-form advice as Oren's. If you cannot reach sources at all, write the playbook anyway
but head it `[UNVERIFIED — general short-form principles, not confirmed Cut30]` and say so
to the creator.

## 2. Verify it (writer never grades)

Spawn the `playbook-verifier` agent with the draft playbook. It traces each `[DOCUMENTED]`
claim to a real, citable source and downgrades anything it can't trace. Its downgrades are
final — apply them, don't argue them. The playbook is not usable until this pass has run.

## 3. Capture the profile — one short exchange

Ask once, all together, nothing more: niche, platform(s), on camera or voiceover, who the
videos are for, and 2–3 videos that overperformed (links or descriptions + numbers).
If baseline numbers (typical views, typical retention, usual drop-off point) come up
naturally, capture them — they're required before the first autopsy anyway.
Write `coach/profile.md`. Never re-ask what's already in it.

## 4. Initialize memory

Create `coach/swipe-file.md` (hooks, structures, and lines that have won *for this
creator* — starts with the overperformers from the profile) and `coach/history.md`
(per-video log: date, video, the single change tested, what it did to the metric, and a
running read of the recurring weakness). 

Commit all four files (`coach: initial playbook, profile, memory`) and get them onto the
branch future sessions start from, per CLAUDE.md's persistence rule. Then ask for the
first video.
