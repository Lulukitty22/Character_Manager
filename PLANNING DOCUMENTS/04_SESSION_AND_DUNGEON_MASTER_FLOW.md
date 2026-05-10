# Session View and Dungeon Master Flow

## Session View v1 Rule

Session View is interactive, but it is not authoritative.

Lock v1 execution to:

- **stage locally, then queue everything**

Examples:

- use potion -> stage request -> send to queue
- cast spell -> stage request -> send to queue
- ready/stow ammo -> stage request -> send to queue
- utility action -> stage request -> send to queue
- downtime/crafting action -> stage request -> send to queue

No direct canonical state mutation happens from Session View in v1, and one-click gameplay affordances should land in the local draft tray rather than immediately hitting GitHub.

## Session Side Panel

Session View should have a side panel focused on:

- Inbox
- Queue Status
- Party/Session Summary

It should show:

- local request drafts
- pending requests
- approved/denied results
- DM replies/messages
- party/session context
- lightweight session status

## Alert Lane

Use one unified alert lane:

- immediate toast/modal for visibility
- persistent inbox/alert entry so issues do not vanish

The same lane handles:

- gameplay adjudication updates
- DM replies
- auth problems
- save/sync failures
- GitHub read/write issues

## Dungeon Master View

Current scaffolded behavior:

- loads active sessions and encounters
- reads queued actions and recent history from GitHub-backed records
- stages approvals/denials locally before sending them
- can already write approve/deny resolutions back to session or encounter logs

Still to add:

- approve, deny, edit, or resolve actions
- apply direct corrections such as damage/healing/state/resource changes
- roll on behalf of players if needed
- write approved outcomes to action logs and character snapshots

## Action Lifecycle

Suggested statuses:

- `queued`
- `approved`
- `denied`
- `canceled`
- `applied`

General flow:

```text
Session View creates local draft
  -> local draft is batched and saved to session or encounter record
  -> Dungeon Master workflow reviews it
  -> outcome is approved, denied, edited, or canceled
  -> approved outcome applies state deltas
  -> logs and character snapshots update
```

## Soft-Rules Philosophy

The D&D gameplay system is an assistive table tool, not strict RAW enforcement.

It should:

- track turns, rounds, actions, reactions, resources, slots, conditions, inventory/resource changes
- warn when something seems illegal or unusual
- allow DM override and table-specific rulings
- support homebrew, loose table logic, and boss exceptions

## Modes

### Encounter Mode

- initiative
- turn owner
- queued actions
- attack/save/damage/heal/condition/resource changes
- reaction/interruption support as queued or DM-inserted events

### Session Utility Mode

- out-of-combat consumables
- prep actions
- rests
- resource/inventory adjustments
- structured downtime hooks
- crafting-adjacent actions such as potion-making
