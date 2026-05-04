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

Codex owns this core/runtime lane:

- schema contract placement in `core/scripts/schema.js`
- shell/library API sanity checks
- density fixes inside existing viewer panels
- `/core` split and shared runtime loading paths

Shared files need a quick note before either agent edits them:

- `core/scripts/views/view-character.js`
- `core/scripts/views/view-character-*.js`
- `core/scripts/library.js`
- any future `share/editor/*`
- any future `/core/*`

## Next Architecture Step

The thin `/core` split is now the intended shared shape:

- `core/scripts/schema.js`
- `core/scripts/library.js`
- `core/scripts/importers/*`
- `core/scripts/dnd-calculations.js`
- `core/scripts/views/*` for renderers used by both app preview and exported sheets
- `core/style/base.css`
- `core/style/sheet.css`
- `share/viewer/index.js` becomes a shell that loads core viewer modules
- `share/editor/index.js` becomes a shell that loads editor modules plus the same core viewer modules for preview
- `ViewCharacter.mount(container, character)` is the current shared viewer seam. Exported sheets, list previews, and editor previews should use this same method until it moves into `/core/viewer`.

Manager-only code remains under `manager/`: GitHub auth/API wrapper, export stub builder, app shell, editor modules, character list, and library management view. Claude can target the `core/...` paths directly in the editor shell manifest now.

## Immediate Test Gate

- `node --check share/viewer/index.js`
- `node --check manager/scripts/export.js`
- `node --check core/scripts/schema.js`
- `node --check core/scripts/library.js`
- `node --check core/scripts/views/view-character.js`
- export Capella from the current staging manager
- open the fresh exported file and confirm it passes the shell states: manifest, styles, renderer, character, library, render

## Agent Notes

- Codex moved the shared runtime into `/core` so exported viewer and future shareable editor can load the same renderer/calculation/library code.
- Claude: please use `core/style/base.css`, `core/style/sheet.css`, and the ordered `core/scripts/...` list from `share/viewer/manifest.json` when drafting `share/editor/manifest.json`.
- Future per-file progress bars should layer on the existing `library-progress` detail shape rather than changing the loader contract unless a real need appears.
- Visual panel-content ports are still intentionally separate from this runtime split. Coordinate before editing `core/scripts/views/view-character-boss.js` because Capella relies heavily on it.

## Visual Overhaul — Source of Truth

The two static HTML mockups in `share/` are the agreed visual target. Anything that lands in the live viewer/editor should look and behave like these once the port is complete:

- `share/style-example.html` — viewer target (Carol Elfnein, full data, all sections)
- `share/style-example-tessa.html` — viewer target (Tessa Brightleaf, leaner sheet for comparison)
- `share/style-example-editor.html` — editor target (left edit pane + right live-preview pane). NOTE this is a *separate* concept from the current `manager/index.html` (which is a list + modal preview). The editor revamp is a wholly separate undertaking from the viewer port.

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

- **List-preview modal sticky head clipping:** Codex applied the cheap compatibility fix by padding `.sheet-preview-body` with `var(--space-8)` in `manager/style/editor.css`. If future mockup work changes the preview modal, revisit whether an explicit `.ovh-tabbed.in-modal` variant is cleaner.

## Next Work Split — Visual Port (Pending Codex Confirmation)

Proposed division for the panel-content port phase, contingent on `/core` split timing:

**Codex (continues current ownership)**:
- `/core` runtime split and path migration
- Panel-content port for `core/scripts/views/view-character-dnd.js` and `core/scripts/views/view-character-spells.js` (already touched for density pass — keep the lane)

**Claude (Step 2 onward)**:
- `share/editor/index.js` + `share/editor/manifest.json` (mirror viewer cascade pattern, plus PAT drawer + write paths)
- Panel-content port for `core/scripts/views/view-character-{identity, inventory, resources, notes}.js`

**Coordinated, neither owns yet**:
- `core/scripts/views/view-character-boss.js` (Capella-heavy, complex toggles) — needs both agents to agree on data shape before porting
- AC mode toggle UI — touches header.js + new CSS + character data shape
- The editor-mockup revamp itself (current `manager/index.html` → left-edit + right-preview layout). This is a separate undertaking from the viewer port and should not start until the viewer port stabilises.

**Trigger to start Step 2 (editor shell)**: `/core` has landed. Claude can target final core paths plus current `manager/scripts/editor/*` paths for editor-only modules.
