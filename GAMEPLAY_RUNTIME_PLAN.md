# GAMEPLAY_RUNTIME_PLAN

## Purpose

This is the companion plan for the next major runtime phase after the thin-shim refactor. Keep `STAGING_PLAN.md` short and status-oriented; keep the fuller gameplay/runtime architecture discussion here.

## Summary

Design the next gameplay phase as a four-surface thin-shim system backed by GitHub-stored character and campaign records:

- `Editor`: generic admin-authoring surface
- `Viewer`: per-character read-only reference sheet
- `Player`: per-character gameplay surface
- `DM`: generic active-encounter dashboard

The system should support full table play through the app, but with a soft-rules / DM-arbiter model rather than strict RAW enforcement. Players submit gameplay actions; the DM approves or denies them. The authoritative session truth is a structured action log, and approved actions immediately project into canonical character snapshot state.

The first deliberate gameplay design includes:

- HP / temp HP / rests
- spell slots
- item/resource/inventory actions
- attack/save/damage rolling
- queued player actions
- DM adjudication
- structured logs
- out-of-combat session utility mode with structured downtime hooks, including future potion-making/crafting support

## Surface Model

### `Editor`

- generic admin/editor surface
- stays responsible for schema editing, item creation, spell authoring, appearance, tags, notes, and raw buildout
- should not become the forever-home for live table flow

### `Viewer`

- per-character export
- read-only, no gameplay mutation controls
- keeps reference chips, viewer cards, cross-links, logs, and stats presentation

### `Player`

- per-character thin shim
- opens directly into one character plus active session/encounter context
- does not expose editor powers like arbitrary item creation, spell authoring, or schema changes
- supports:
  - self-view sheet context
  - queued combat actions
  - queued out-of-combat utility/downtime actions
  - own logs/history
  - own prep/loadout/resource use

### `DM`

- generic thin shim
- opens into active encounter dashboard
- party-wide and encounter-wide view
- can adjudicate queued actions, apply damage/healing/state changes, and operate on any linked character

## Data Model Additions

Add new campaign records as first-class records in the shared backend model, not ad hoc files.

Introduce a new collection family for:

- `campaigns`
- `parties`
- `encounters`
- `sessions`
- optionally `recipes` if crafting definitions become shared records later

### Party Record

- stable membership
- linked character refs
- optional roles / display ordering / ownership hints

### Session Record

- current active party
- active encounter ref if any
- session notes / timestamp / status
- downtime context

### Encounter Record

- participant refs
- initiative state
- round / turn / phase
- queued actions
- accepted action log
- DM-facing adjudication state

### Action Event / Queue Item

- `actorId`
- `requestedById`
- `targetIds`
- action kind
- payload
- status: `queued` / `approved` / `denied` / `canceled` / `applied`
- roll data if present
- proposed state deltas
- resulting state deltas
- audit metadata

Keep the canonical saved shape lean. Rich labels, paths, and display-friendly actor cards can be hydrated at runtime from the current party/session/encounter context instead of being copied into every saved log entry.
When a gameplay packet points at a real shared library object, prefer stable refs like `itemRef`, `recordRef`, and `resourceRef` over loose human text so those packets stay linkable, inspectable, and reusable across Player/DM/Viewer surfaces.

Characters remain canonical long-lived sheets. Campaign/session/encounter records hold the live play context.

## Sync and Authority Model

Use a hybrid GitHub-backed sync model tuned for play, while still keeping GitHub as the main backend.

### Authority Rules

- Players do not directly mutate shared canonical gameplay state during active play.
- Player surface creates queued intents/actions.
- DM surface approves, denies, or edits them.
- DM can mutate any linked character through approved actions.
- DM can also apply direct table rulings or corrections.

### Authoritative Truth

The encounter/session action log is authoritative for what happened.

Approved actions immediately project into:

- character snapshot state
- encounter/session derived state

### Canonical Sync

Approved DM actions should immediately write updated character state back to character JSON. Do not wait until encounter end.

Protect this with:

- serialized writes
- SHA/version conflict handling
- explicit replayable event log
- derived-state rebuild capability if needed

### Refresh Model

Do not promise true multiplayer realtime.

Plan for:

- optimistic local UI
- explicit refresh hooks
- short polling / change checks for active session records
- conflict-safe writes

Treat GitHub as "near-live enough with discipline," not as a websocket system.

## Gameplay Behavior Model

The D&D Gameplay system should be soft-rules assist, not strict enforcement.

### Rules Philosophy

- track turns / rounds / actions / reactions / resources
- warn when something seems illegal or unusual
- allow DM override and table-specific rulings
- support homebrew / boss exceptions like Capella-level nonsense cleanly

### Encounter Mode

- initiative
- turn owner
- queued actions
- attack / save / damage / heal / condition / resource changes
- reaction and interruption support as queued or DM-inserted events

### Session Utility Mode

- out-of-combat consumables
- prep actions
- rests
- resource/inventory adjustments
- structured downtime hooks
- crafting-adjacent actions like potion making

These should be modeled as logged gameplay events, not editor cheats.
Downtime payloads should describe inventory inputs/outputs with shared record refs wherever possible, so a crafting request can point at the exact herb bundle or potion record the DM is evaluating.

### Action Categories

Direct state actions:

- use resource
- spend slot
- rest
- consume item
- ready/stow ammo

Contested actions:

- attack roll
- saving throw request
- skill/ability check
- damage application
- healing resolution

Downtime actions:

- queued utility/crafting/prep actions with inventory/resource inputs and outputs

## Rolling, Logs, and Derived State

Actions, rolls, and logs should be part of the first deliberate gameplay spec.

### Rolling Model

- actions should carry structured roll definitions
- auto-fill dice + modifiers from character sheet, linked record data, and active effects where possible
- DM surface can roll on behalf of anyone
- player surface can request or submit actions that require rolls
- DM can approve/replace/reject roll outcomes as table reality demands

### Logs

Store structured event entries, not only human text.

Each important action should record:

- actor id
- context
- roll formula / rolled result / modifiers
- target ids
- approval result
- applied deltas
- timestamp
- optional table note / DM reply

### Derived State

Current HP/resources/slots/conditions are projections of accepted action history plus current snapshot.

- keep snapshots for speed
- keep logs detailed enough that state can be audited or repaired if needed

## Viewer/Editor Boundary

### Viewer

- remains read-only
- may show logs, resource state, linked references, cross-links, and explanatory chips
- no fake or dead action affordances

### Editor

- remains admin-authoring
- can create/modify library records, schema sections, tags, appearance, notes, items, spells, and related data
- is not the future player-runtime surface
- gameplay features that belong to table flow should move toward Player/DM surfaces, not pile forever into the editor

## Public Interfaces / Records to Add

Important new interfaces/types to define in implementation:

Campaign record types:

- `party`
- `session`
- `encounter`

Action queue/log types:

- action request
- action resolution
- applied state delta
- roll payload
- target payload

Surface boot contracts:

- generic DM boot context
- per-character Player boot context
- per-character Viewer boot context
- existing Editor boot context retained

Gameplay state concepts:

- session mode vs encounter mode
- queued vs approved vs applied action
- explicit actor / target / authority roles

Do not leave these as informal blobs; make them named shapes in the schema/runtime model.

## Suggested Implementation Phases

### Phase 1: Shared Model and Storage

- add campaign/session/encounter schemas
- add storage/index support in `library/records/`
- add GitHub helper methods needed for these records
- add shared action/log types

### Phase 2: Player Surface

- add per-character gameplay shim/export path
- keep export entry simple: one export choice should branch into either Viewer or Player card output instead of scattering separate export buttons across the editor
- support queueing self-actions
- support session utility mode for non-combat actions
- show personal logs/history
- keep the first Player MVP readable for anyone who can open the file, but only writable when the browser already has a GitHub PAT configured for the repo

### Phase 3: DM Surface

- add generic DM shim
- load active session/encounter
- review/approve/deny queued actions
- apply direct damage/healing/state corrections

### Phase 4: Resolution and Rolling

- structured roll payloads
- DM-side rolling on behalf of players
- attack/save/damage/heal resolution flows
- derived-state rebuild helpers if needed

### Phase 5: Downtime and Crafting Hooks

- add structured downtime action templates
- inventory/resource input-output actions
- potion-making/crafting-adjacent queue items
- optionally formalize recipes as shared records

## Test Plan

### Core Flow Tests

- Player queues a deterministic self-action outside combat; DM approves; character state updates immediately
- Player queues a contested combat action; DM resolves roll/outcome; character and encounter state update correctly
- DM applies direct damage/healing to a character; logs and character snapshot stay in sync
- spell slot use/restore works only for valid slot levels and survives refresh/reload
- ammo loop works through queue + approval model without losing inventory/resource coherence

### Sync / Persistence Tests

- two rapid actions against the same character do not corrupt canonical state
- approved actions are reflected in both encounter log and character snapshot
- refresh after save shows latest approved state in Player, DM, and Viewer surfaces
- conflict handling survives concurrent writes without silent state loss

### Mode Tests

- Viewer stays read-only and never exposes dead gameplay buttons
- Player surface supports out-of-combat session utility mode
- DM surface opens into active encounter dashboard with party context
- Editor still handles authoring without becoming the only gameplay runtime

### Downtime Tests

- queue a potion-making or crafting-like utility action with resource/inventory inputs
- DM approval produces expected inventory/resource outputs and audit trail
- non-combat actions still log cleanly and sync canonically

## Assumptions and Defaults

- GitHub remains the primary backend for v1 gameplay planning.
- True websocket-grade realtime is out of scope for the first design.
- The system should feel responsive through optimistic local UI plus polling/refresh discipline, not by claiming perfect live sync.
- DM is the final authority during active play.
- Players queue actions; they do not become final canonical gameplay changes without DM approval.
- Character files remain the canonical long-lived sheet snapshots.
- Encounter/session logs are authoritative for what happened during play.
- Campaign/session/encounter objects belong in a new campaign records collection, not ad hoc top-level files.
- Viewer and Player are per-character shims; Editor and DM are generic repo-tracked shims.
- Downtime is included in v1 as structured hooks, not a full profession/crafting simulation.
- Rules enforcement should be assistive and override-friendly, because the table uses homebrew, larp logic, and boss exceptions.
