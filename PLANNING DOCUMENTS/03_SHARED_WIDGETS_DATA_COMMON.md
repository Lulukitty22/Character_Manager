# Shared Widgets in `data/common`

## Goal

Move duplicated editor/viewer/session logic into shared widgets under `data/common`, then mount the same widgets with per-surface capability presets.

Avoid maintaining separate editor-only, viewer-only, and player-only versions of the same bar, row, or action behavior unless a true surface-specific exception is needed.

## First Widgets to Formalize

| Widget | Shared Behavior | Detail / History Home |
|---|---|---|
| HP widget | Same renderer/state adapter in `D&D Stats` and `Resources`; one bar/history shape. | HP history in `D&D Stats`. |
| Inventory widget | Same row/chips/refs across Editor, Character Card, and Session View. | Ownership/metadata/history in `Inventory`. |
| Item action widget | One `Use` entrypoint per actionable item; opens valid action menu. | Used by `Inventory` and `D&D Gameplay`. |
| Spell slot/action widget | Shared slot rendering and cast/spend/restore affordances. | Spell prep/reference/history in `Spells`. |
| Resource widget | Shared bars/chips for ammo, charges, temp HP, and special pools. | Resource history in `Resources`. |
| GitHub auth widget | Shared auth drawer/widget. | Editor and Session View first; Dungeon Master View later. |

## Auth Widget Rules

The GitHub auth widget should:

- be based on the existing `share/examples/style-example-editor.html` prototype pattern
- use browser-local PAT storage in v1
- show connected GitHub identity after verification
- show owner, repo, branch, token status, and test result
- allow test, save, disconnect actions
- open from Editor and Session View
- later support Dungeon Master View

Never embed PATs, Discord bot credentials, or live-bridge secrets into exported files.

## Capability-Gated Rendering

Shared widgets should receive a surface preset rather than branching by hardcoded surface names everywhere.

Examples:

- Editor inventory row can show edit/admin controls.
- Character Card inventory row is read-only.
- Session View inventory row can show queue/request controls.
- Dungeon Master View can later show adjudication/correction controls.

## Newly Landed Shared Runtime Files

These shared runtime files are now present in the repo and should be treated as landed:

- `data/common/scripts/surface-presets.js`
- `data/common/scripts/widgets/github-auth-widget.js`
- `data/common/scripts/views/view-character-gameplay.js`

Related runtime wiring that is also landed:

- manifests now load the shared preset/widget/runtime pieces
- Character Card and Session View boot flows now set the active capability preset at runtime
- the shared character renderer now includes a `D&D Gameplay` tab
- editor/session shells now expose the shared GitHub auth drawer entrypoint

Additional shared-widget progress now landed:

- common HP bar/state helper now lives in `data/common/scripts/widgets/hp-widget.js`
- common gameplay item-mutation helpers live in `data/common/scripts/gameplay-mutations.js`
- common inventory/action helpers live in `data/common/scripts/widgets/inventory-widget.js`
- Character Card inventory rows and editor inventory rows now derive their shared item mechanics from the common inventory/action helper instead of duplicating the same logic in two separate places
- editor inventory `Use` actions now run through the same common mutation layer that the gameplay surface uses, instead of trapping item behavior in editor-only code
- shared HP percent/tone/readout behavior now drives the main HP bars in D&D Stats, Resources, manager cards, boss toggle updates, and the editor gameplay tab instead of each surface hand-rolling its own thresholds
