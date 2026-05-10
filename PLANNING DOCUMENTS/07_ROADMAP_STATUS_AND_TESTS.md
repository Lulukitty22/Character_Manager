# Roadmap, Status, and Tests

## Phase Plan

| Phase | Name | Status |
|---|---|---|
| 1 | Shared Model and Storage | Done / landed. |
| 2 | Session View Runtime | In progress, currently partly under older `Player` naming. |
| 3 | Shared Widget Migration | Started / active. |
| 4 | Dungeon Master View | Planned, separate, not implemented yet. |
| 5 | Resolution and Rolling | Planned. |
| 6 | Downtime and Crafting Hooks | Partially seeded / planned. |

## Phase 1 Done

- Campaign/session/encounter schemas.
- `library/records/` storage/index support.
- GitHub helper methods.
- Shared action/log types.
- Schema helpers for actor refs, target refs, roll payloads, state deltas, action requests/resolutions, party members, initiative entries.
- First-class collections for `campaigns`, `parties`, `sessions`, `encounters`.
- Seeded campaign -> party -> session -> encounter chain around Aina Quickquiver and Carol Elfnein.
- Seeded downtime/crafting request and approved ammo/attack log examples.

## Phase 2 In Progress

Currently implemented under older `Player` naming:

- `data/player/manifest.json`
- `data/player/boot.js`
- `data/player/scripts/app.js`
- Session View exports currently boot `data/player/boot.js`
- export chooser can create either Character Card or gameplay card
- runtime reads session/encounter context from shared records
- runtime shows personal queue/history
- runtime queues GitHub-backed requests when PAT exists
- runtime stays read-only without PAT
- runtime also now includes:
  - public `Session View` wording in the export/UI flow
  - Session View side-panel structure
  - inbox/alerts plumbing
  - shared GitHub auth drawer entrypoint
  - 30-second polling scaffolding

Next:

- Decide whether to rename internal `data/player/` paths.
- Route all actions into queue/request flow.
- Route `session_utility` actions/logs to session records.
- Route `encounter` actions/logs to encounter records.
- finish the unified alert-lane behavior and inbox polish
- deepen the shared auth widget flow and connected-user UX
- live-test the 30-second polling/manual refresh behavior in a normal browser

## Recently Landed Shared Runtime Items

These are now present in the repo:

- shared surface-capability presets in `data/common/scripts/surface-presets.js`
- shared GitHub auth drawer in `data/common/scripts/widgets/github-auth-widget.js`
- shared read-only / queue-aware `D&D Gameplay` renderer in `data/common/scripts/views/view-character-gameplay.js`
- manifests updated so Editor, Character Card, and Session View load shared preset/widget/runtime pieces
- public export/runtime wording changed from `Viewer` / `Player` toward `Character Card` / `Session View`
- viewer/session boot flows set the correct active capability preset
- `D&D Gameplay` tab added to shared character-card/session-view renderer
- editor gameplay tab renamed to `D&D Gameplay`
- spell-slot/cast history added to the shared `Spells` tab
- GitHub auth drawer entrypoint added to editor shell and Session View shell
- Session View inbox/alerts plumbing added
- near-real-time polling scaffolding added at 30-second interval
- default/session seed polling interval changed from 5 minutes to 30 seconds
- common gameplay item-mutation helpers added in `data/common/scripts/gameplay-mutations.js`
- common HP helper added in `data/common/scripts/widgets/hp-widget.js`
- common inventory/action helpers added in `data/common/scripts/widgets/inventory-widget.js`
- editor inventory `Use` actions now share the common mutation layer instead of relying on editor-only item behavior
- Character Card/editor inventory rows now share common item-mechanics derivation
- main HP bars now share percent/tone/readout behavior across D&D Stats, Resources, manager cards, boss toggle updates, and the editor gameplay tab

## Remaining Work

- Full browser parity pass for editor, Character Card exports, and Session View exports.
- Complete shared widget migration for HP, inventory rows, item actions, resources, and spell slots.
- Add proper inventory/item history presentation in the `Inventory` tab.
- Improve library viewer/editor support for gameplay records.
- Build Dungeon Master View later as a separate surface.
- Add resolution, rolling, and damage/healing flows.
- Define import normalization/review workflow for external records.
- Improve appearance coverage and debug/status presentation.

## Recommended Next Implementation Pass

The highest-value next step is to finish the shared-widget migration for the character-facing/runtime-facing pieces before building Dungeon Master View.

Recommended order:

1. deepen the shared inventory row/widget with capability-gated controls across all surfaces
2. reuse the shared item `Use` action menu between `Inventory`, `D&D Gameplay`, and later Session View queue controls
3. finish HP/resource unification beyond bars, especially history placement and resource-widget cleanup
4. shared spell slot/action widget cleanup
5. inventory/item history presentation in `Inventory`
6. then begin the first Dungeon Master View queue/adjudication dashboard

## Verification Checklist

### Thin Shims

- Open `share/Character_Manager_Editor.html` locally and confirm remote editor boot works.
- Export a read-only Character Card and a Session View card.
- Confirm exported shims are tiny and do not embed character JSON or renderer bundles.
- Confirm shims load latest character from GitHub.
- Force bad boot URL and missing character path to confirm failure states.

### Shared Widgets

- HP bar/tone/readout behavior renders consistently in `D&D Stats`, `Resources`, manager cards, boss toggles, and editor gameplay.
- Inventory rows render across Editor, Character Card, and Session View with capability-gated controls.
- Item `Use` menu behaves as admin/editable, read-only, or queue-only depending on preset.

### Gameplay Flow

- Character Card shows `D&D Gameplay` in read-only summary form.
- Session View routes actions into queue/request flow.
- Session View shows sheet, session context, queue/history, inbox/alerts, and GitHub auth drawer access.
- Session View can queue actions only when a PAT is present.
- Spell slots only use valid levels and survive reload.
- Ammo loop works through queue + approval without inventory/resource drift.
- Crafting/downtime request uses refs, produces outputs, and logs cleanly.

### Sync and Records

- Polling target is about 30 seconds.
- Manual refresh works.
- Queued actions survive refresh/reload.
- Overlapping writes do not silently drop requests.
- Seeded examples use stable ids and real library refs where possible.
- No new gameplay records rely on free-text identity when stable ids/refs exist.

### Static Checks

- Run syntax checks on touched runtime files.
- Run `node tools/validate-library-schema.js`.
- Run stale reference searches before closing major refactors.
