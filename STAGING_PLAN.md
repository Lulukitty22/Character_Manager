# STAGING_PLAN

## Rule Zero

Every time you read this plan during implementation, update `STAGING_PLAN.md` in the same change set if status, architecture, paths, or decisions have changed.

## Current Goal

Land the thin-shim refactor cleanly so the repo has three stable top-level buckets:

- `library/` for persisted content
- `data/` for runtime code and manifests
- `share/` for human-opened HTML shims and examples

The D&D stats visual port is already done and browser-verified. This restructuring is the current blocker and focus.

## Decisions Locked In

- Use lowercase directory names everywhere.
- Store character JSON in `library/characters/`.
- Store reusable non-character content in `library/records/`.
- Keep `records` as the name for reusable library documents.
- Keep `README.md` and `STAGING_PLAN.md` at repo root.
- `share/Character_Manager_Editor.html` is the long-lived repo-tracked editor entrypoint.
- Exported viewer HTMLs are ultra-thin shims only.
- Viewer/editor shims use `fetch()` plus script injection for remote boot loading rather than raw `<script src>` to GitHub text endpoints.
- Backward compatibility for older exported HTMLs is not required during this refactor.

## Target Structure

- `library/characters/`
- `library/records/`
- `data/common/`
- `data/viewer/`
- `data/editor/`
- `share/Character_Manager_Editor.html`
- `share/examples/`

## What Is Done

- Moved character files into `library/characters/`.
- Moved reusable library collections into `library/records/`.
- Moved shared runtime from `core/` into `data/common/`.
- Moved editor/manager runtime into `data/editor/`.
- Moved maintained viewer shell assets into `data/viewer/`.
- Moved style examples into `share/examples/`.
- Replaced exported viewer HTML generation with an ultra-thin shim contract.
- Replaced the repo-tracked editor HTML with an ultra-thin shim that boots `data/editor/boot.js`.
- Updated the main runtime to load characters from `library/characters/`.
- Updated GitHub path helpers, library record path helpers, and validation tooling to understand the new layout.
- Fixed the post-refactor manager shell so GitHub reads honor the configured branch instead of silently reading the repo default branch.
- Cleaned the manager shell text after the refactor exposed old mojibake UI strings.
- Fixed GitHub Contents API JSON decoding to use UTF-8 instead of raw `atob()` text so character cards load correctly from the manager shell.
- Restored the manager settings render path after the shell cleanup accidentally referenced `escapeHTML()` before defining it.
- Removed the empty legacy `core/`, `editor/`, `manager/`, `characters/`, `share/editor/`, and `share/viewer/` directories.
- Ran syntax checks on the moved loader/export/helper files.
- Ran the library validation pass successfully after teaching the validator to skip `library/characters/` and tolerate UTF-8 BOM on JSON input.

## What Still Needs To Be Finished

- Delete the now-empty top-level `app/` directory once the external process lock is gone.
- Do a final browser parity pass on the refactored manager shim and exported viewer shims. The in-app browser verification attempt was blocked by `net::ERR_BLOCKED_BY_CLIENT`, so this still needs a manual follow-up in a normal browser session.

## Backend Follow-Ups

- Gameplay state should stay local and coherent during a session:
  - inventory actions like shooting, drinking, and reloading should update local character state immediately
  - ammo/resource counts should stay visible and in sync without needing a GitHub round-trip per click
  - save should persist the final local result once, not perform one remote write per gameplay action
  - bow/item actions must hard-stop when a required resource is empty instead of merely clamping the bar at 0
- Inventory/action UX follow-up:
  - add clearer real-time visibility for ammo, durability, and other consumable state tied to item actions
  - review whether gameplay healing should stay average-only, become roll-driven, or support DM-confirmed results
  - decide and document the ammo model explicitly: inventory should represent owned stock, while gameplay resources should represent immediately spendable/loaded state; do not duplicate the same number in both places unless one is derived from the other
- D&D/DM backend roadmap:
  - add explicit dice and damage calculation support for spells and actions
  - support DM-side rolling on behalf of party members for AFK/slow turns
  - keep a trustworthy log trail for rolls and action outcomes
  - review how GitHub/raw caching affects action/roll logs versus initial HTML boot loading, and decide what must stay local/live versus what can tolerate delayed propagation
- Editor content follow-up:
  - appearance coverage is still incomplete in the maintained editor shell
  - emoji/icon regressions are currently considered polish/UI work and can be handled separately from backend correctness
  - the current Gameplay tab likely needs a larger "D&D Gameplay" redesign pass; do not silently reshuffle spell-slot, spell-log, and item-action responsibilities without a design discussion first

## Latest Fixes

- Verified `origin/staging` after live manager testing: Aina Quickquiver currently saves with `15` arrows, `1` arrow bundle, and the user-confirmed potion quantity edit of `15`.
- Hardened gameplay item actions so resource-backed actions surface live resource chips and refuse to fire when the required pool is empty.
- Locked healing-item use to the computed item amount shown by the gameplay UI instead of letting the amount field drift arbitrarily.
- Fixed HP gameplay logging so it records the actual applied heal/damage after clamping to max/min HP, instead of logging impossible deltas like `+7` when only `+4` or `+0` really happened.
- Serialized manager saves so repeated clicks do not stack overlapping save requests.
- Upgraded library record/index/manifest writes to retry GitHub `409` conflicts multiple times instead of giving up after a single collision.
- Replaced the most visible busted live-shell emoji/icon labels with ASCII-safe labels in the maintained editor shell and character presentation badges.

## Shim Contract

Viewer export HTML should contain only:

- repo metadata (`github-owner`, `github-repo`, `github-branch`)
- character metadata (`character-id`, `character-path`)
- one root mount element
- a tiny inline bootstrap that fetches `data/viewer/boot.js`
- native `alert()` on pre-UI bootstrap failure

The permanent editor HTML should follow the same pattern but point at `data/editor/boot.js`.

No embedded character snapshot. No embedded renderer bundle. No inline fallback app UI beyond native bootstrap failure reporting.

## Data Contract Notes

- Characters are authored documents.
- Records are reusable building blocks such as spells, items, traits, feats, resources, classes, species, and tags.
- Editor preview and exported viewer should continue to use the same viewer mount path.

## Verification Checklist

- Open `share/Character_Manager_Editor.html` locally and confirm remote editor boot works.
- Export at least Carol and Capella viewer shims and confirm they do not embed character JSON or renderer logic.
- Verify viewer shims still load the latest character from GitHub.
- Verify manager preview still uses the same shared viewer renderer path.
- Verify GitHub save paths target `library/characters/`.
- Verify library loading resolves reusable content from `library/records/`.
- Force a bad boot URL and confirm the shim fails with native bootstrap reporting.
- Force a missing character path and confirm the remote loader shows the in-app missing-file state.
- Run static checks and repo-wide stale reference searches before closing the refactor.

## After This Refactor

Treat the thin-shim contract as stable. Any future deliberate breaking changes to loader behavior or layout should be recorded here before implementation proceeds.
