# Repository and Branches

`Lulukitty22/Character_Manager` stores characters in `library/characters`, reusable definitions in `library/records`, runtime in `data`, and HTML entrypoints in `share`. The existing editor/shims/exporter target `staging`; GitHub's default branch `main` has an older layout. A local branch switch alone does not change which runtime exported sheets fetch.

- Fallback intended: `Legacy`, pinned to GitHub staging `f7056ce080560023e5c0575f656e2d2f85b6fcad` (2026-06-06), before documentation restructuring.
- Repair work: `codex/character-repairs`, based on that fallback. Existing serving targets remain staging until deliberately changed.
- Old local staging was `b4fe6fc`; it retains Carol's useful inline recovery data. It is an ancestor of the fallback; recover with Git history rather than overwrite current data blindly.
- Preserve unfinished session/DM code in the fallback. Archiving its plans does not remove that code.
- Check `git status`, `git branch -avv`, and current remote refs before changes; stale local tracking refs caused the original audit mismatch.
