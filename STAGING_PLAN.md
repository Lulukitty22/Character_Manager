# Staging Stabilization Plan

This branch is forward-only while the new library, viewer, editor, and share-shell architecture settles. Old exported files and old data shapes can break; the fix is to port them to the new system instead of bending the new system around them.

## Current Agreements

- `staging` is the integration branch. `main` stays stable until the full flow is tested.
- The exported character sheet should be a tiny permanent stub that loads maintained code from GitHub.
- Export stubs should fetch raw GitHub shell files as text and inject them, not use raw GitHub as a direct `<script src>`, so browser MIME checks do not block the shell.
- The shareable editor should follow the same cascade-shell pattern as the viewer.
- The editor preview must render through the same viewer loading/rendering path as exported sheets, so one preview test also tests the shareable viewer.
- Library records are loaded from GitHub by manifest/index files, then handed to runtime code with `Library.seedCollections()`.
- `Schema.SCHEMA_VERSION` is the app-level character/viewer contract. Library record schema versions remain separate and are owned by `LibraryRecords.SCHEMA_VERSION`.
- `share/viewer/manifest.json` only declares the minimum compatible character schema major. It should not duplicate the current `Schema.SCHEMA_VERSION`.
- Loading progress is emitted as factual steps plus current path/detail. The current UI shows one overall bar; the event shape leaves room for per-file bars later if large files need it.

## Short-Term File Ownership

Claude owns this first viewer-shell chunk:

- `share/viewer/index.js`
- `share/viewer/manifest.json`
- `manager/scripts/export.js`, while the tiny viewer stub is still settling

Codex owns this first stabilization chunk:

- schema contract placement in `manager/scripts/schema.js`
- shell/library API sanity checks
- density fixes inside existing viewer panels
- the first `/core` split proposal and migration path

Shared files need a quick note before either agent edits them:

- `manager/scripts/views/view-character.js`
- `manager/scripts/views/view-character-*.js`
- `manager/scripts/library.js`
- any future `share/editor/*`
- any future `/core/*`

## Next Architecture Step

Do a thin `/core` split first, not a whole-repo move:

- `core/schema/schema.js` or `core/scripts/schema.js`
- `core/library/*` for shared library loading and record normalization
- `core/viewer/*` for the renderers used by both app preview and exported sheets
- `share/viewer/index.js` becomes a shell that loads core viewer modules
- `share/editor/index.js` becomes a shell that loads editor modules plus the same core viewer modules for preview
- `ViewCharacter.mount(container, character)` is the current shared viewer seam. Exported sheets, list previews, and editor previews should use this same method until it moves into `/core/viewer`.

After that works, move the manager app around the proven core instead of moving every script path at once.

## Immediate Test Gate

- `node --check share/viewer/index.js`
- `node --check manager/scripts/export.js`
- `node --check manager/scripts/schema.js`
- export Capella from the current staging manager
- open the fresh exported file and confirm it passes the shell states: manifest, styles, renderer, character, library, render
