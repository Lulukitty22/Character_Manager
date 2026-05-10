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

- 2026-05-10: Chose shared inventory/item-action widgets as the next implementation slice because they unlock reuse across Editor, Character Card, and Session View faster than starting with Dungeon Master or full HP unification.
- 2026-05-10: Scoped this pass to shared inventory/action primitives first, with HP/resource unification treated as a follow-up if time stays clean after the inventory migration.
- 2026-05-10: Realized item-action reuse needs a common mutation layer too, otherwise a shared inventory/action menu would only be presentation-deep and still keep behavior trapped in editor-only code.
- 2026-05-10: Added a common gameplay-mutation layer and a common inventory/action widget layer so shared item behavior can exist in code, not just in the docs.
- 2026-05-10: Wired the editor inventory tab into the shared inventory/action layer, including real `Use` actions that sync unsaved inventory edits before mutating character state.
- 2026-05-10: Shared item mechanics now render from one inventory/action helper in both the sheet viewer and the editor inventory tab, so the row semantics are finally starting to converge instead of drifting.
- 2026-05-10: Extended the shared inventory action menu into Session View inventory rows in queue mode, so capability-driven behavior now exists in a real player-facing surface instead of only in editor land.
- 2026-05-10: Patched the newly-added-item edge so actionable rows can still render their shared `Use` menu immediately instead of waiting for a later rebuild cycle.
- 2026-05-10: Chose to pull HP math and tone handling into a small shared helper next, because the duplication across sheet sections, manager cards, boss toggles, and editor gameplay was real but still tractable in one pass.
- 2026-05-10: Landed `data/common/scripts/widgets/hp-widget.js` and wired it into the main HP bars so the shared runtime now owns percent/tone/readout behavior instead of letting each surface freestyle it.
- 2026-05-10: The internal Session runtime path has been renamed away from `data/player/` to `data/session_viewer/` so the repo stops teaching a public/private naming mismatch to every future implementation pass.
- 2026-05-10: Started the shared spell-slot/resource widget cleanup with common helpers so the next runtime passes can stop re-deriving slot counts and resource bars in three different styles.
- 2026-05-10: Added the first `data/dungeon_master/` scaffold plus `share/Dungeon_Master.html`, including a basic queue review surface that can already approve or deny queued actions back into session/encounter records.
- 2026-05-10: The first dungeon master scaffold resolves queued actions back into gameplay logs, but it does not yet project approved or denied outcomes into character snapshots or apply resulting deltas automatically.
- 2026-05-10: Left HP/resource unification for the next pass on purpose once the inventory/action slice was coherent, rather than half-landing a second widget migration in the same stretch.
- If maintaining root summary docs again, keep them downstream of this segmented folder instead of allowing them to drift independently.

## Completed Notes

- 2026-05-10: Split the oversized unified gameplay plan into smaller section files.
- 2026-05-10: Verified the shared preset/auth/gameplay runtime files landed in repo code.
- 2026-05-10: Verified Session View inbox/alerts plumbing and 30-second polling scaffolding exist in repo code.
