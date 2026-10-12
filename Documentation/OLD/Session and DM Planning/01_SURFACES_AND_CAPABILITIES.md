# Surfaces and Capability Presets

## Locked Public Surfaces

| Surface | Purpose | Older / Internal Name |
|---|---|---|
| `Editor` | Admin/authoring surface. | `Editor` |
| `Character Card` | Read-only per-character reference/export. | `Viewer` |
| `Session View` | Player-facing at-table gameplay surface. | `Player`, now implemented under `data/session_viewer/`. |
| `Dungeon Master` | Future DM-facing adjudication/control runtime. | Older docs sometimes said `DM` or `DM-like surface`. |

## Critical Separation Rule

`Session View` and `Dungeon Master` are **not** the same thing.

- `Session View` is for the player/character side of table play.
- `Dungeon Master` is a separate future surface for reviewing, approving, denying, editing, and resolving queued actions.
- Do not combine player queue UX with DM adjudication UX unless an explicit design update says to do so.

## Surface Responsibilities

### Editor

- Full authoring/admin surface.
- Handles schema editing, item creation, spell authoring, appearance, tags, notes, and raw buildout.
- Can expose `D&D Gameplay` with admin/table affordances.
- Should not become the permanent home for all live table flow.

### Character Card

- Read-only per-character export/reference.
- Shows readable stats, references, chips, cross-links, resource state, and read-only gameplay summaries where useful.
- Must not show fake/dead action buttons.

### Session View

- Per-character at-table runtime.
- Opens into one character plus active session/encounter context.
- Supports queued combat actions, queued utility/downtime actions, queue/history, prep/loadout/resource use, and lightweight session status.
- No raw metadata editing.
- No direct canonical gameplay mutation in v1.
- Without browser-local GitHub auth, it should stay read-only/locked where appropriate and explain the limitation.

### Dungeon Master

Planned future surface.

Expected responsibilities:

- Active session/encounter dashboard.
- Party-wide and encounter-wide state.
- Review, approve, deny, edit, and resolve queued actions.
- Apply direct table corrections such as damage, healing, state changes, or resource adjustments.
- Roll on behalf of anyone if needed.
- Persist approved outcomes to logs and character snapshots.

## Capability Presets

Suggested capability flags:

- `canEditMetadata`
- `canEditQuantityDirectly`
- `canUseActions`
- `canQueueActions`
- `canViewLogs`
- `canDirectlyMutateState`
- `canManageAuth`

Suggested presets:

| Preset | Metadata | Direct Mutation | Queue Actions | Logs | Auth |
|---|---:|---:|---:|---:|---:|
| `editor` | yes | yes/admin | optional/admin | yes | yes |
| `character_card` | no | no | no | read-only | minimal/no |
| `session_view` | no | no in v1 | yes | simplified + source summaries | yes |
| `dungeon_master` | no raw authoring by default | yes through adjudication/corrections | review/resolve | yes | yes |

Runtime capability presets load during boot/init. They should not be embedded into exported HTML snapshots.
