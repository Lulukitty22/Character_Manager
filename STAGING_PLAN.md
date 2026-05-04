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

Claude owns this viewer/editor shell lane:

- `share/viewer/index.js`
- `share/viewer/manifest.json`
- future `share/editor/index.js`
- future `share/editor/manifest.json`

Codex owns this architecture/runtime lane:

- schema contract placement in `core/scripts/schema.js`
- shell/library API sanity checks
- density fixes inside existing viewer panels
- `/core`, `/app`, and `/editor` split and shared runtime loading paths

Shared files need a quick note before either agent edits them:

- `core/scripts/views/view-character.js`
- `core/scripts/views/view-character-*.js`
- `core/scripts/library.js`
- `app/index.html`
- `editor/scripts/*`
- any future `share/editor/*`
- any future `/core/*`

## Current Architecture Shape

The repo is now split by responsibility:

- `core/` is shared runtime used by the local app, exported viewer, and future shareable editor.
- `app/` is the local GitHub-backed manager shell, character list, library manager, and export builder.
- `editor/` is editor UI modules and editor-specific styles.
- `share/` is maintained share shells, share manifests, and static visual mockups.
- `library/` and `characters/` remain data.

`core/` currently contains:

- `core/scripts/schema.js`
- `core/scripts/github.js`
- `core/scripts/library.js`
- `core/scripts/importers/*`
- `core/scripts/dnd-calculations.js`
- `core/scripts/views/*` for renderers used by both app preview and exported sheets
- `core/style/base.css`
- `core/style/sheet.css`
- `share/viewer/index.js` becomes a shell that loads core viewer modules
- `share/editor/index.js` becomes a shell that loads editor modules plus the same core viewer modules for preview
- `ViewCharacter.mount(container, character)` is the current shared viewer seam. Exported sheets, list previews, and editor previews should use this same method until it moves into `/core/viewer`.

Local app/editor paths:

- `app/index.html`
- `app/scripts/export.js`
- `app/scripts/app.js`
- `app/scripts/views/view-list.js`
- `app/scripts/views/view-library.js`
- `editor/scripts/*`
- `editor/style/editor.css`

Claude can target `core/...` paths directly in the editor shell manifest, and can target `editor/...` for editor-only modules.

## Immediate Test Gate

- `node --check share/viewer/index.js`
- `node --check app/scripts/export.js`
- `node --check app/scripts/app.js`
- `node --check core/scripts/schema.js`
- `node --check core/scripts/library.js`
- `node --check core/scripts/views/view-character.js`
- export Capella from the current staging manager
- open the fresh exported file and confirm it passes the shell states: manifest, styles, renderer, character, library, render

## Agent Notes

- Codex moved shared runtime/viewer/GitHub client into `/core`, local app shell into `/app`, and editor modules/styles into `/editor`.
- Claude: please use `core/style/base.css`, `core/style/sheet.css`, and the ordered `core/scripts/...` list from `share/viewer/manifest.json` when drafting `share/editor/manifest.json`; add `core/scripts/github.js` only to editor/app shells that need authenticated GitHub writes; use `editor/scripts/*` and `editor/style/editor.css` for editor-only pieces.
- Future per-file progress bars should layer on the existing `library-progress` detail shape rather than changing the loader contract unless a real need appears.
- Visual panel-content ports are still intentionally separate from this runtime split. Coordinate before editing `core/scripts/views/view-character-boss.js` because Capella relies heavily on it.

## Mount Seams

Shells should stay small and call explicit mount seams instead of reaching into section renderers directly:

- `ViewCharacter.mount(container, character)` — existing shared viewer/preview entry point in `core/scripts/views/view-character.js`.
- `Editor.mount(container, character, options)` — next editor entry point to add in `editor/scripts/editor-mount.js`.

`Editor.mount` should own the single-character editing surface and emit changes through callbacks such as `onChange(character)` and `onSave(character)`. PAT drawers, Discord/fatal overlays, schema handshakes, and GitHub save orchestration belong to shells like `app/index.html` or future `share/editor/index.js`, not to editor section modules.

## Future Compatibility Handshakes

- Character/viewer compatibility uses `Schema.SCHEMA_VERSION` against share manifest `minCompatibleSchemaMajor`.
- Library record compatibility is separate via `LibraryRecords.SCHEMA_VERSION`. Not blocking v1 editor shell, but future `share/editor/manifest.json` should add a `minCompatibleLibraryRecordSchemaMajor` handshake before allowing library-record editing.

## Visual Overhaul — Source of Truth

The two static HTML mockups in `share/` are the agreed visual target. Anything that lands in the live viewer/editor should look and behave like these once the port is complete:

- `share/style-example.html` — viewer target (Carol Elfnein, full data, all sections)
- `share/style-example-tessa.html` — viewer target (Tessa Brightleaf, leaner sheet for comparison)
- `share/style-example-editor.html` — editor target (left edit pane + right live-preview pane). NOTE this is a *separate* concept from the current `app/index.html` (which is a list + modal preview). The editor revamp is a wholly separate undertaking from the viewer port.

### Visual port audit (as of `620423e`)

What's live in the manager viewer:

| Mockup feature | Status | Where |
|---|---|---|
| Sticky character head + tab nav | ✅ live | `core/scripts/views/view-character-header.js` emits `.ovh-sticky-head` + `.ovh-tab-row` |
| Shimmer-gold on character name | ✅ live | `.ovh-shimmer-gold` in `core/style/base.css` |
| Quickstats (HP/AC/Init/Spd) in head | ✅ live | `core/scripts/views/view-character-header.js` |
| Tabbed panels with auto-drop empty tabs | ✅ live | `core/scripts/views/view-character.js` |
| Tab switching JS | ✅ live | `core/scripts/views/view-character.js` |
| Compact/collapsible spell + ability records | ✅ live | `core/style/sheet.css` `.sheet-compact-record` |
| `ViewCharacter.mount()` shared seam | ✅ live | used by list preview, app preview, exported shell |
| Active-AC value in head | ⚠️ partial — picks active mode, no toggle UI yet | `core/scripts/views/view-character-header.js` |

What's NOT yet ported (still mockup-only — section renderers still emit old `.sheet-section`/`.sheet-card`/`.sheet-spell-entry` markup):

- AC mode toggle UI (multi-AC switcher: Base / Bladesong / Shield+Bladesong / Otherworldly)
- Appearance variant tabs + image gallery + video support
- Relationships card linking to other character files
- Tag/chip tooltips with definitions; right-click pin
- Skill 3-state pip cycler in viewer (gold prof / purple expertise — color pips, not text)
- Mechanic chip overflow with `+N more` expand
- Mini progress bars inline on chips for uses/charges/ammo
- Cross-link chips (e.g. Lute "supports Charm Person" → jumps to spell)
- Player Note / DM Note / Warning callout boxes
- HP history log expandable in Resources
- Custom resource progress bar (Spell Memories, etc.)
- Ornamental SVG section dividers (one source, reused) — CSS exists, not yet emitted by section renderers
- Identity card with avatar + structured field rows (currently flat)
- New typography hierarchy throughout panel content

### Known bug

- **List-preview modal sticky head clipping:** Codex applied the cheap compatibility fix by padding `.sheet-preview-body` with `var(--space-8)` in `editor/style/editor.css`. If future mockup work changes the preview modal, revisit whether an explicit `.ovh-tabbed.in-modal` variant is cleaner.

## Next Work Split — Visual Port (Pending Codex Confirmation)

Proposed division for the panel-content port phase, contingent on `/core` split timing:

**Codex (continues current ownership)**:
- `/core` + `/app` + `/editor` runtime split and path migration
- Panel-content port for `core/scripts/views/view-character-dnd.js` and `core/scripts/views/view-character-spells.js` (already touched for density pass — keep the lane)

**Claude (Step 2 onward)**:
- `share/editor/index.js` + `share/editor/manifest.json` (mirror viewer cascade pattern, plus PAT drawer + write paths)
- Panel-content port for `core/scripts/views/view-character-{identity, inventory, resources, notes}.js`

**Coordinated, neither owns yet**:
- `core/scripts/views/view-character-boss.js` (Capella-heavy, complex toggles) — needs both agents to agree on data shape before porting
- AC mode toggle UI — touches header.js + new CSS + character data shape
- The editor-mockup revamp itself (`app/index.html` → left-edit + right-preview layout). This is a separate undertaking from the viewer port and should not start until the viewer port stabilises.

**Trigger to start Step 2 (editor shell)**: `/core`, `/app`, and `/editor` have landed. Claude can target final core paths plus `editor/scripts/*` for editor-only modules.

---

## Step 2 Status (Claude, commit `dda0c29`)

### What landed

| File | Purpose |
|---|---|
| `editor/scripts/editor-mount.js` | `Editor.mount(container, character, options)` seam. Returns `{getCurrentCharacter, refresh, destroy}`. Builds tabs+panels using existing `editor-*` modules. Emits debounced `onChange`. |
| `share/editor/manifest.json` | Cascade pointer for editor shell. Loads `core/style/* + editor/style/editor.css`, full `core/scripts/*` (so live preview works), all `editor/scripts/* + editor-mount.js`. `minCompatibleSchemaMajor: 2`. |
| `share/editor/index.js` | Maintained editor shell — meta read, schema handshake, manifest fetch, library seed, renders sticky toolbar + edit pane + live preview pane + PAT drawer. PAT stored at `share-editor-pat:{owner}/{repo}`. Save uses GitHub Contents API (per-friend PAT → correct attribution). |
| `app/scripts/export.js` | Adds `SheetExporter.exportEditor(characterData, filePath)` + `EDITOR_SHELL_STYLES` for chrome. |
| `app/scripts/app.js` | "✏️ Export Editor" button next to existing viewer Export. |
| `app/index.html` | Loads `editor-mount.js`. |

### Not yet done — handing off to Codex

Token budget on Claude side ran out before completing these. Codex picks up from here:

**1. Sanity-check Step 2 in browser** (highest priority)
- Pull staging, run `app/index.html`, open Capella, click `✏️ Export Editor`
- Open the downloaded HTML
- Verify: spinner → loads → edit pane + live preview render → PAT drawer opens → Test Connection works → editing a field updates preview within ~½ sec → Save commits via GitHub
- `node --check share/editor/index.js`, `node --check editor/scripts/editor-mount.js`, `node --check app/scripts/export.js`

**2. Refactor `app/scripts/app.js` editor mounting to use `Editor.mount()`** (parity test)
- Currently `app.js` has its own inline tab orchestration (~80 lines around `buildTabDefinitions` + tab switching wiring + `collectCharacterData`)
- Replace with: `const handle = Editor.mount(panelsContainer, currentCharacter, { onChange })`; `handle.getCurrentCharacter()` replaces `collectCharacterData()`
- This is the same parity move that `ViewCharacter.mount()` enabled for the viewer side. Same code path → same render in app and shell. Catches future drift early.
- Files: `app/scripts/app.js` (search for `EditorBase.buildTab` and `collectCharacterData`)

**3. Visual panel-content port** (the bigger remaining chunk per "What's NOT yet ported" list above)
- Pre-Step-2 split was: Codex owns `view-character-dnd.js` + `view-character-spells.js`, Claude owns `view-character-{identity, inventory, resources, notes}.js`. Codex now owns the lot until Claude tokens recover.
- Source of truth for target visuals: `share/style-example.html` (Carol) and `share/style-example-tessa.html` (Tessa)
- Mockup CSS lives inline in those files — copy the `.row-chip`, `.list-row`, `.row-mini-bar`, etc. patterns into `core/style/sheet.css` as `.ovh-*` classes alongside the existing chrome
- Renderers in `core/scripts/views/view-character-*.js` should emit the new markup; old `.sheet-section`/`.sheet-card`/`.sheet-spell-entry` classes can be deleted (forward-only, per the staging philosophy)

**4. Editor shell chrome — possible follow-ups** (after #1 verifies it works)
- The `EDITOR_SHELL_STYLES` block in `app/scripts/export.js` is ~220 lines of inline CSS baked into the export stub. Tradeoff: simpler bootstrap vs. styles can't auto-update with the rest. If preferred, move into `editor/style/editor-shell.css` and add to `share/editor/manifest.json` styles array.
- The shell uses raw `fetch` for GitHub API (read sha, PUT contents). Could refactor to use `core/scripts/github.js` if its API surface fits — would dedupe the auth code. Quick scan whether `GitHub.putFile()` or similar exists.

### Codex follow-up after Claude handoff

- `app/scripts/app.js` now mounts the local manager editor through `Editor.mount()` as well. The duplicate app-only `buildTabDefinitions()` / tab switching / `collectCharacterData()` path has been removed, so local editor, exported editor, and future editor preview work all harvest character edits through the same seam.
- Static checks passed for `app/scripts/app.js`, `share/editor/index.js`, `editor/scripts/editor-mount.js`, and `app/scripts/export.js`.
- Remaining Step 2 verification: open the exported editor in a real browser and test the PAT flow with an actual token. Codex can smoke-test load/render locally, but should not claim full save verification without Lulu's PAT.
- Keep `EDITOR_SHELL_STYLES` extraction as a later cleanup unless the inline block starts blocking shell iteration. The parity seam was the more important drift killer.

### Reference files (for either agent)

- Viewer mockup: `share/style-example.html` (full Carol data, all sections)
- Viewer mockup, lean: `share/style-example-tessa.html` (Tessa, smaller comparison)
- Editor mockup: `share/style-example-editor.html` (left-edit + right-preview, but is a future visual goal — not what Step 2 currently produces, which is functionally similar but visually rough)
- Plan doc: `C:\Users\Nicol\.claude\plans\can-you-help-me-majestic-robin.md` (original architecture plan)

### Lulu-facing summary

✅ Done on staging:
- Library reorganized into indexed tree (Codex)
- `/core` + `/app` + `/editor` split (Codex)
- Tabbed sheet + sticky head + shimmer name + quickstats (Claude)
- Density pass on spells + abilities (Codex)
- Maintained viewer shell with auto-update (Step 1)
- Maintained editor shell with auto-update + PAT save (Step 2)
- Schema-version handshake + breaking-change overlay (both shells)
- Library loading with bounded concurrency + factual progress (Codex)

🟡 In-flight:
- Step 2 needs in-browser verification (Codex picking up)
- `app.js` editor refactor to use `Editor.mount()` for parity

❌ Not started:
- Panel-content port (the inside-of-tab visuals — chips, dividers, callouts, etc.)
- AC mode toggle UI
- Appearance gallery + video support in viewer
- Relationships card
- Editor visual chrome polish to match `share/style-example-editor.html`
