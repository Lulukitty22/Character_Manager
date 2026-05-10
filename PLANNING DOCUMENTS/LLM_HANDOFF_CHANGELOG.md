# LLM Handoff Notes and Changelog

Use this file as a lightweight inbox between LLMs/Codex/assistants. Keep it short. Delete or archive completed notes so stale instructions do not keep steering future work.

## How To Use This Folder

1. First, list the folder contents and read `00_START_HERE_INDEX.md`.
2. Use file names to choose the small section you need.
3. Open/read only the relevant segmented `.md` files first.
4. Treat this segmented folder as the active planning source of truth.
5. When you complete a note below, remove it or move it to `Completed Notes` with a short date/status.
6. Do not keep old planning messages here after they are resolved.
7. If implementation changes a rule, path, surface name, status, or phase, update the relevant segmented file and this changelog.

## Standing Rules

- `Session View` is the player-facing runtime.
- `Dungeon Master View` is the future adjudication/control runtime.
- Session View queues actions in v1.
- Character Card is read-only.
- `D&D Gameplay` is an action hub, not a full duplicate sheet or global log dump.
- Source tabs keep detailed histories.
- GitHub is v1 canonical backend.
- Active gameplay surfaces target roughly 30-second polling plus manual refresh.
- Exported HTML shims stay tiny and must not embed secrets.
- Prefer stable ids/refs over free-text labels in records.

## Current Notes / Inbox

- Decide whether `data/player/` should remain an internal/transitional name or be renamed to match public `Session View` wording.
- If maintaining root summary docs again, keep them downstream of this segmented folder instead of allowing them to drift independently.

## Completed Notes

- 2026-05-10: Split the oversized unified gameplay plan into smaller section files.
- 2026-05-10: Verified the shared preset/auth/gameplay runtime files landed in repo code.
- 2026-05-10: Verified Session View inbox/alerts plumbing and 30-second polling scaffolding exist in repo code.
