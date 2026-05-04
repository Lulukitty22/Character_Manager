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

## Visual Overhaul — Source of Truth

The two static HTML mockups in `share/` are the agreed visual target. Anything that lands in the live viewer/editor should look and behave like these once the port is complete:

- `share/style-example.html` — viewer target (Carol Elfnein, full data, all sections)
- `share/style-example-tessa.html` — viewer target (Tessa Brightleaf, leaner sheet for comparison)
- `share/style-example-editor.html` — editor target (left edit pane + right live-preview pane). NOTE this is a *separate* concept from the current `manager/index.html` (which is a list + modal preview). The editor revamp is a wholly separate undertaking from the viewer port.

### Visual port audit (as of `620423e`)

What's live in the manager viewer:

| Mockup feature | Status | Where |
|---|---|---|
| Sticky character head + tab nav | ✅ live | `view-character-header.js` emits `.ovh-sticky-head` + `.ovh-tab-row` |
| Shimmer-gold on character name | ✅ live | `.ovh-shimmer-gold` — `base.css:647` |
| Quickstats (HP/AC/Init/Spd) in head | ✅ live | header.js:57 |
| Tabbed panels with auto-drop empty tabs | ✅ live | `view-character.js:101-110` |
| Tab switching JS | ✅ live | `view-character.js:128` |
| Compact/collapsible spell + ability records | ✅ live | `sheet.css:483` `.sheet-compact-record` |
| `ViewCharacter.mount()` shared seam | ✅ live | used by list preview, app preview, exported shell |
| Active-AC value in head | ⚠️ partial — picks active mode, no toggle UI yet | header.js:13 |

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

- **List-preview modal clips the sticky head.** `view-list.js:247` opens `.sheet-preview-modal` and mounts the sheet inside. `.ovh-sticky-head` uses `margin: calc(var(--space-8) * -1) …` tuned for the manager's main layout padding, which the modal body doesn't have. Result: head extends past modal padding and looks misaligned. Fix is either (a) pad `.sheet-preview-body` with `var(--space-8)` to satisfy the negative-margin assumption, or (b) introduce `.ovh-tabbed.in-modal` CSS variant with zero head margins.

## Next Work Split — Visual Port (Pending Codex Confirmation)

Proposed division for the panel-content port phase, contingent on `/core` split timing:

**Codex (continues current ownership)**:
- Thin `/core` split per "Next Architecture Step" above
- Panel-content port for `view-character-dnd.js` and `view-character-spells.js` (already touched for density pass — keep the lane)

**Claude (Step 2 onward)**:
- `share/editor/index.js` + `share/editor/manifest.json` (mirror viewer cascade pattern, plus PAT drawer + write paths)
- Panel-content port for `view-character-{identity, inventory, resources, notes}.js`
- Quick fix on the list-preview modal sticky-head clipping (above)

**Coordinated, neither owns yet**:
- `view-character-boss.js` (Capella-heavy, complex toggles) — needs both agents to agree on data shape before porting
- AC mode toggle UI — touches header.js + new CSS + character data shape
- The editor-mockup revamp itself (current `manager/index.html` → left-edit + right-preview layout). This is a separate undertaking from the viewer port and should not start until the viewer port stabilises.

**Trigger to start Step 2 (editor shell)**: either (a) `/core` lands and Claude can target final paths, or (b) Codex green-lights writing editor manifest against current `manager/scripts/editor/*` paths with a known rename later.
