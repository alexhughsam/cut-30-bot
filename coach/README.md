# coach/ — the coach's memory

These files are the Cut30 Coach's persistent state. `/setup` creates them; every session
reads them at start; every engagement that changes them gets committed and pushed.
Missing or `UNBUILT` playbook/profile is a blocker — the coach must say so, not rebuild
silently from memory.

| File | What it holds | Written by |
|---|---|---|
| `playbook.md` | The distilled Cut30 method, every entry tagged `[DOCUMENTED — source]`, `[BOOTCAMP]`, or `[MY READ]`; verified by the `playbook-verifier` agent before use | `/setup`, bootcamp-note merges |
| `profile.md` | Niche, platforms, camera/voiceover, audience, overperformers, baseline numbers | `/setup`, updated as the creator shares more |
| `swipe-file.md` | Hooks, structures, and lines that have won *for this creator* | `/setup` (seeded from overperformers), `/autopsy` as wins accumulate |
| `history.md` | Per-video log: the single change tested, what it did to the metric, and the running read of the recurring weakness | `/script` (the bet) and `/autopsy` (the result) |

Bootcamp notes from the creator are gospel: merged into `playbook.md` as `[BOOTCAMP]`,
overriding anything researched. Notes pasted before the playbook exists are held
verbatim in `bootcamp-notes.md` until `/setup` merges them.

Committed state must reach the repo's **default branch** to survive — remote sessions
run on per-session branches that future sessions never read. Before rebuilding anything
"missing," check `git log --all -- coach/`: `[BOOTCAMP]` entries can't be re-researched.
