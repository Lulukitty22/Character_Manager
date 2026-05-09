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
- Removed the empty legacy `core/`, `editor/`, `manager/`, `characters/`, `share/editor/`, and `share/viewer/` directories.
- Ran syntax checks on the moved loader/export/helper files.
- Ran the library validation pass successfully after teaching the validator to skip `library/characters/` and tolerate UTF-8 BOM on JSON input.

## What Still Needs To Be Finished

- Delete the now-empty top-level `app/` directory once the external process lock is gone.
- Do a final browser parity pass on the refactored manager shim and exported viewer shims. The in-app browser verification attempt was blocked by `net::ERR_BLOCKED_BY_CLIENT`, so this still needs a manual follow-up in a normal browser session.

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
