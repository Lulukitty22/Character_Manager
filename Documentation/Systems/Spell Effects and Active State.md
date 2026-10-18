# Spell Effects and Active State

Updated 2026-10-18. This document owns the shared casting, response, roll and active-effect workflow. It is a design, not implemented behavior. Resume the current architecture discussion at [Campaigns and Shared Data](Campaigns%20and%20Shared%20Data.md).

The 2026-10-12 audit found conflicting header/combat AC, merely owned effects treated as active, disconnected modes/resources and missing spell definitions. No new browser audit is claimed. See [requirements](Character%20Sheet%20Requirements.md), [containers and scrolls](Spell%20Containers%20and%20Consumable%20Sources.md), and [rendering pointers](../Primary/Character%20Rendering.md).

## Casting workflow — selected 2026-10-17

DM/party coordination is included in this design. This does not restart every archived DM feature or authorize runtime implementation.

**Review → confirm → reserve resources → wait for required approval and turn readiness → resolve.** Confirmation creates a request and resource holds; it is not a completed cast.

| Stage | Intended behavior |
|---|---|
| Review | Show source, spell and cast level, targets, options, current-caster versus saved statistics, costs and timing. Nothing is spent. |
| Confirm/reserve | Create a pending action and hold its resources. Distinguish owned, held and available amounts. Held resources cannot fund another request; they are not yet spent. |
| Waiting | Coordinate approval and eligible timing. Approval and turn readiness are distinct. Exact approval gates remain policy questions. Preserve normal Reaction triggers. |
| Resolve | Determine required rolls, saves, targets and choices. Apply source-specific payments, consumption, effects, damage, healing, concentration and expiry; update affected state and linked logs. |
| Reconcile | Proposed requirement: one action identity links requests, revisions, holds, rolls, effects and logs. Retries or duplicate approvals must not apply the action twice. Partial failure must not separate payment from recorded consequences. |

Players may cancel their own request before approval, releasing unspent holds while retaining request history. DM rejection and other abort cases still need policy. A failed or interrupted cast follows its source's payment rules; it is not equivalent to canceling an unapproved request.

For example, book Shield reserves the caster's applicable resource and Reaction. A prepaid scroll reserves the actual scroll. Rifle Shield reserves a loaded round, charges and Reaction, and uses the selected delivery rule. Opening an editor or saving a sheet is never a cast.

Open: exact approval gates, timeouts, changes while waiting, final commit authority, rejection, undo and corrections. Client disconnection does not itself release server reservations; see the architecture document. DM gating must preserve the opportunity to use valid Reaction spells.

## Scheduling and repeating response polls — selected 2026-10-17

The scheduling options are **Instant** and **Next Turn**. Reaction is an authored action cost and trigger, not a third scheduling button. These options apply to state-changing gameplay interactions such as spells, item use and inventory actions.

| Timing | Selected intent |
|---|---|
| Instant | Submit without waiting for the actor's own initiative. Use the applicable response window and DM handling. Approval, triggers, action costs, eligibility and held resources still apply. |
| Next Turn | Queue for the actor's own eligible turn and normal action budget. Queuing multiple requests does not execute them all for free. |

After a gameplay event, poll for responses. Resolve **one** response, show its outcome according to the submitted visibility setting, then open a fresh poll against the updated state. Public is the default; hidden requests do not expose private details. Continue until everyone skips the same current poll or the DM force-skips remaining responses. A previous skip does not carry over after a response changes the situation. Having reacted once is not a closing condition.

A parent event remains paused wherever its rules require. For example:

1. An attack roll would hit; pause before damage.
2. The target submits Shield as Instant, with the normal Reaction trigger and cost.
3. Resolve Shield, then recheck the hit against the increased AC.
4. Open a fresh response poll. When it closes, finish the pending consequences.

Shield does not guarantee a miss and does not negate Fireball's Dexterity save. The earlier Fireball/Shield example illustrated the desired workflow, not a change to either spell. No automatic retroactive HP rollback is selected.

Response polls are steps within game flow. They do not create new initiative turns, restore actions or Reactions, or advance effect durations. Ordinary events may have windows even if no mechanical Reaction is available. Instant does not grant free off-turn item handling or use of inaccessible items. The user's uncertain backpack/arrows example did not establish a universal exception.

Open: who participates when someone is disconnected, timeout behavior, simultaneous submissions, nested trigger ordering and unfinished requests when the DM force-skips. Do not infer an automatic countdown, autopass, resource loss or retrospective rewrite. Ordinary campaign build/equipment edits also require DM approval. They may need authoring-specific UI rather than combat timing, but retain the approval gate. A solo owner switches to DM mode to approve their own requests; there is no bypass. Imports still need detailed workflow design; not every UI change is a gameplay action.

## Competing submissions and request revisions

The user selected: “DM chooses in order of submitted.” Display competing Instant submissions chronologically and let the DM approve the next response in submission order. This is not automatic FIFO execution or initiative priority. Resolve one response, show its outcome to permitted viewers and repoll.

Resources are held at submission. Another response neither spends nor releases those holds automatically. Recheck targets and eligibility before approval:

- A second heal may become unnecessary after the first heal, while remaining legal.
- A second protection may lose its trigger after the first prevents the attack.
- An attack may become invalid when its target moves out of range.

The player may keep, revise or cancel their own request **before DM approval**. Cancellation releases holds. Revision validates and reserves the replacement cost without duplicating or losing the old hold. Kept requests retain holds and still require validity checks. Never silently retarget or fire an obsolete request.

Use the reviewed revision for authoritative approval. Prevent both old and revised requests from executing or spending. Queue position after revision, approval/edit races, ties, latency, hidden enemy submissions and any DM override of ordering remain design questions. This does not authorize rewriting completed actions.

## Active effects, game time and early ending

Configured effects count down and expire automatically on the normal shared game clock. Use the relevant actor's start/end-of-turn boundary, round duration or other configured condition. No wall-clock countdown is selected. Out-of-combat time advancement and incomplete configurations remain open.

- Start the effect on actual activation, not submission or reservation. At expiry, remove its contribution and refresh affected statistics. Link the status and log to its originating event; duplicate messages must not expire it twice.
- The DM may end an effect early. Update active state, derived values and logs without rewriting its definition or paid snapshot.
- Players request an early end through the same Instant approval/event flow. Scheduling adds no extra D&D Reaction cost; use the feature's actual ending requirements.
- Items, spells, abilities and forms use the same event and clock system. A response poll never adds six seconds or resets a turn budget.
- Keep required concentration rolls and replacement/end choices explicit. Unknown ending conditions require marked manual handling, not invented expiry or failed saves.

Character tabs are public by default; the owner can make each tab private to the owner and DM(s). The character name remains visible. **Action/effect notifications are separately public by default, even if the source tab is private.** At request submission the user can hide that spell/action from other players. The option applies to casting, item consumption, value adjustments and other gameplay requests. This clarification replaces the earlier unresolved conflict between section sharing and public effects.

Hiding an action/effect does not disable its mechanics. Do not leak hidden details through tooltips or notifications. Hidden records remain available to the owner and DM(s). Detailed notification/log fields, aggregate-stat presentation, control of others' effects and whether visibility can be revised later still need design. A public event never grants read access to its private source tab.
Validate turn advancement against unfinished response chains; do not skip a required response opportunity.

## Roll ownership and input modes

When an effect requires a target PC's roll, prompt that PC's player. The DM may take over using the target's configured formula or a manual result. Use the target character's data, not the DM character's bonuses. The DM handles NPCs. A caster cannot silently supply another PC's save.

| Mode | Behavior |
|---|---|
| Configured roll with bonuses | Generate dice from the selected character/action formula and apply configured bonuses. Show dice, modifiers and total. |
| Custom dice expression | The user enters an expression such as 1d20 or 2d20; the app rolls it. Add no character bonuses unless explicitly included or selected. Advantage/keep-die UI remains open. |
| Manual final result | Accept one numeric total from physical dice or other adjudication. Do not add bonuses again or infer individual faces, natural 20s or critical hits from a total. |

Use the same action/target/result/log flow for attacks, saves, damage, healing and concentration. Record input mode, submitting actor, formula-owning character, expression and known raw/modifier/final values. A manual total need not pretend the breakdown is known. Do not silently reroll.

One prompt accepts one final result. A DM takeover and player reply must not both resolve it. Area effects need the appropriate separate target prompts; wait for required inputs before applying their dependent consequences. Re-evaluate eligibility when state changes. An “evade” example does not grant universal saving throws against weapon attacks.

Paid scrolls retain formulas rolled on use, not manufacturing-time outcomes. Secret rolls, result visibility, reroll/critical confirmation and accepted-result corrections remain open. Hidden NPC defenses are not automatically public.

## Structured effects and manual adjudication

Author or import verified structured behavior for spells, items and traits: base AC versus bonuses, triggers, targets, scope, duration, conditional Advantage, damage, healing, resources and source/version. Keep readable definitions available. Do not infer executable rules solely from names, prose or unreviewed LLM output.

The user selected partial automation: allow a feature even when some parts need explicit DM adjudication. Clearly identify automated, unknown and manual parts. Record manual outcomes within the same action, approval and log flow; do not apply a part twice. Essential missing costs, formulas or targets must be resolved before dependent consequences commit. This is not permission to treat a missing definition as complete or bypass logging.

Review of prose against structured fields and later LLM-assisted extraction remain design work.

## Definition updates and publication

Published corrections flow through live references. Customizing or duplicating a definition creates a wholly independent record; none of its fields continue inheriting from the original. This replaces the earlier field-level override design. Track origin, source, rules edition and revision. Owned quantities, charges and contents remain instance state, not definition customization.

Refresh dependent views consistently when linked definitions change. Independent custom/duplicate definitions retain their own values. There is no additional per-character acceptance gate. Do not convert independent historical copies into linked entries automatically, reset owned quantities/uses/contents, rewrite paid scroll snapshots or alter historical rolls and logs.

Pending actions and active effects use the current linked definition, including edits while they are pending or active. Revalidate pending requests against current costs, targets and eligibility before execution; detailed races and changed-condition handling still need implementation design. Preserve paid scroll snapshots and completed historical results. Custom/duplicated definitions remain wholly independent. Campaign players propose changes and the campaign DM approves campaign publication. Only explicitly assigned core maintainers publish global changes; DM status alone grants no core rights. See [Campaigns and Shared Data](Campaigns%20and%20Shared%20Data.md).

## Related decisions and implementation dependencies

[Containers and scrolls](Spell%20Containers%20and%20Consumable%20Sources.md) owns physical depth, nonempty deletion, capacity overrides, the single-scroll lifecycle and crafting rules. [Aetherlock](../Class%20Reference/Aetherlock%20Engineered%20Rounds.md) owns weapon-specific actions and recipes. These settled mechanics do not need another vote to continue architecture design.

Existing calculation/rendering paths include `data/common/scripts/dnd-calculations.js` and `views/view-character-dnd.js`, `views/view-character-header.js`, and `views/view-character-boss.js` in the common scripts folder. Inventory harvesting in `editor-inventory.js:syncPanelToCharacter`, spells in `editor-spells.js:readTab`, and conversion in `data/common/scripts/library.js` need lossless round trips before migration. See [Editor and Saving](../Primary/Editor%20and%20Saving.md).

The library validator skips character files. Existing audit reproductions are evidence, not proof of fixes. Carol's production JSON remains old. LLM support follows reliable structured data and reviewed provenance; no model integration has been selected.

Prior rules sources, recorded as verified 2026-10-17: [Shield](https://www.dndbeyond.com/spells/2619019-shield) and [Fireball](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions#Fireball). This cleanup does not claim new rules verification.
