# Records, Sync, Auth, and Thin Shims

## Target Structure

```text
library/
  characters/
  records/
    campaigns/
    parties/
    sessions/
    encounters/
    ...other reusable records...

data/
  common/
  editor/
  viewer/
  player/        # current transitional internal path for the public Session View surface

share/
  Character_Manager_Editor.html
  examples/
```

## Record Collections

Campaign/session/encounter data should be first-class shared records, not ad hoc files.

Collections:

- `campaigns`
- `parties`
- `sessions`
- `encounters`
- optional later `recipes`

Characters remain canonical long-lived sheets. Campaign/session/encounter records hold live play context.

## Record Shape Summary

### Party

- stable membership
- linked character refs
- optional roles, display order, ownership hints

### Session

- current active party
- active encounter ref if any
- notes, timestamp, status
- downtime context
- session-utility queue/log ownership

### Encounter

- participant refs
- initiative state
- round / turn / phase
- encounter queue/log ownership
- DM-facing adjudication state

### Action Request / Event

Core fields:

- `actorId`
- `requestedById`
- `targetIds`
- action kind
- `payload`
- `status`
- roll data, if present
- proposed state deltas
- resulting state deltas
- audit metadata
- optional table note / DM reply

## Normalization Rules

- Use stable ids/refs for `actorId`, `requestedById`, `targetIds`, item refs, resource refs, and spell refs.
- Prefer `itemRef`, `recordRef`, `resourceRef`, and spell refs over free-text labels.
- Treat display names as hydrated runtime data, not canonical identity.
- Keep saved payloads lean; hydrate rich labels/cards/paths at runtime.
- Apply the same rules to seeded examples and future records.

## GitHub Sync Model

GitHub remains canonical for v1:

- character snapshots
- session records
- encounter records
- queued actions
- adjudicated action logs

Use:

- roughly 30-second polling while Session View or Dungeon Master View is open
- manual refresh controls
- local pending/request state between polls
- conflict-safe writes
- serialized writes
- SHA/version conflict handling
- replayable event logs
- derived-state rebuild helpers where needed

Do not promise websocket-grade realtime.

## Future Live Bridge

Only if GitHub polling is too sluggish:

- separate service or relay
- optional Discord-backed signal path if useful
- no browser-embedded bot credentials
- no exported HTML acting like a Discord bot
- GitHub snapshots remain canonical unless a later decision changes that

## Thin-Shim Contract

Exported Character Card and Session View HTML should contain only:

- repo metadata: `github-owner`, `github-repo`, `github-branch`
- character metadata: `character-id`, `character-path`, where needed
- one root mount element
- tiny inline bootstrap that fetches the correct runtime boot file
- native `alert()` on pre-UI bootstrap failure

Permanent editor HTML follows the same pattern and boots `data/editor/boot.js`.

Never embed:

- character snapshots
- renderer bundles
- fallback app UI
- PATs
- Discord credentials
- live-bridge secrets
