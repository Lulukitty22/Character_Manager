# Character Sheet Requirements

Updated 2026-10-18. These requirements derive from [Carol's accepted tabletop sheet](../Character%20Sheets/Carol%20Elfnein.md) and apply across characters. They describe intended capabilities, not implemented behavior. Runtime migration and other character repairs remain deferred. DM/party-aware casting is included in the current design.

Resume at [Campaigns and Shared Data](Campaigns%20and%20Shared%20Data.md). The dependency order below is not an instruction to restart settled container or character-build decisions.

## Build calculations and provenance

- Explain class and subclass levels, proficiency bonus (PB), ability contributions, HP, saves, skills, Expertise and tool formulas. Warn about above-limit ability scores without imposing hard caps.
- Distinguish native proficiencies from conditional item grants. Do not add PB twice. Skill/tool synergy is contextual and requires the applicable rule and DM adjudication; Manifold is not global Advantage.
- Distinguish owned, carried, held, equipped, attuned and active items; replication plans and active replicas; permanent acquisitions, temporary creations, elixirs, potions and ammunition. Retain source-specific recharge and expiry rules.
- Preserve acquisition provenance. Documenting historical equipment or stock does not automatically debit current gold or slots.

## Containers, scrolls and crafting

[Spell Containers and Consumable Sources](Spell%20Containers%20and%20Consumable%20Sources.md) owns the detailed rules.

- Support named books and bags, nested contents, user-controlled tab order and complete save/reload/import/export. Opening a tab does not activate or equip an item.
- Apply selected physical depth rules, block deletion of nonempty containers, and preserve contents when capacity is exceeded. Warn and allow explicit capacity overrides. Unknown measurements are not zero or verified fit.
- Keep reusable definitions, paid casting snapshots and owned instances distinct. Moving or mounting a scroll preserves the same physical item and original snapshot.
- Binder casting uses current caster statistics and resources. Loose-scroll and Spellround casting use the original scribe snapshot. Save formulas and roll at release; do not combine donor and current-caster bonuses.
- Keep scribing, mounting, removal and firing separate. Use the selected Arcana multiplier and cantrip exception in the container document. Eligibility is separate from the cost/time modifier.
- Track chambers, physical ammunition, canister charges and readiness separately. Keep fresh True Strike effects outside paid payload snapshots. Use [Aetherlock Engineered Rounds](../Class%20Reference/Aetherlock%20Engineered%20Rounds.md) for actions and [Costs and Damage](../Class%20Reference/Aetherlock%20Costs%20and%20Damage.md) for the ledger.

## Actions, resources, rolls and effects

[Spell Effects and Active State](Spell%20Effects%20and%20Active%20State.md) owns the detailed workflow.

- Review, confirm, reserve, wait for required approval/readiness, then resolve. Held resources cannot fund another request; confirmation alone does not spend them or apply effects.
- Provide Instant and Next Turn scheduling while retaining actual action costs and triggers. Repeated response polls resolve one response at a time, then reopen against the changed state. A poll closes when everyone skips that poll or the DM force-skips.
- Present competing submissions chronologically for DM processing. Before approval, players may keep, revise or cancel their own requests. Revalidate eligibility and costs; prevent both an old request and its revision from executing.
- Prompt the target PC's controller for required rolls; allow DM takeover. Support configured rolls with bonuses, app-rolled custom expressions, and manual final totals without adding bonuses again. Record source and known breakdown without inventing dice faces.
- Use structured effects for verified AC, speed, attack, damage, healing, duration and stacking behavior. Explain derived values consistently across views. Unsupported parts require explicit manual DM adjudication within the same recorded action flow.
- Expire configured effects on the shared game clock and correct turn boundaries. Response polls do not advance turns. Support DM early ending and player end requests. Notifications are public by default even for private source tabs; the submitter can hide an action/effect from others at request submission.
- Use stable action identities and coordinated updates to prevent duplicate payments, rolls or effects. Rejection, timeouts, correction and some approval policies remain open; do not infer automatic rewinds.

## Campaigns and shared data

[Campaigns and Shared Data](Campaigns%20and%20Shared%20Data.md) owns accounts, authority, portability, privacy, hosting and disconnected behavior.

- Separate the global core catalogue from campaign definitions and overrides. Support multiple campaigns per account and campaign-specific roles. Owners control campaignless characters and can create campaigns. A solo campaign has one person with player/edit and DM rights; that person submits requests and switches to DM mode to approve them through the same system. Ordinary campaign character edits also require DM approval. Only explicitly assigned core maintainers publish global definitions.
- Every placement elsewhere creates an independent character copy. The source remains until separately approved deletion. Missing campaign definitions produce disabled placeholders; manual import and relinking restore the same entry without duplicating stock.
- DM-issued invitations lead to join requests and membership approval. Membership does not automatically approve a character or content import.
- Tabs are public by default. Owners may make individual tabs private to themselves and campaign DMs, leaving only the character name visible if all tabs are hidden. Viewing is separate from editing; enforce private reads at the backend.
- Linked definitions remain live for pending actions and active effects. Custom/duplicated records remain independent. Preserve owned state, paid snapshots and completed history. Customization makes the whole definition independent; field-level inheritance is superseded.
- Use a hosted service that remains available while the user's PC is off. Firebase is preferred; exact products, authentication, budget and schema are undecided.
- Disconnected clients make no authoritative changes. Unsent input may remain only in page memory. Reconnect fetches current state and revalidates before submission; corrections require DM approval. Do not claim durable drafts or automatic replay.

## Persistence, verification and later work

Preserve unknown and nested data through editor harvesting, normalization, save/reload and import/export before migration. Verify a no-change round trip and actual viewer/editor behavior, including desktop and narrow layouts. The current library validator skips character files and cannot establish character correctness.

Implementation dependencies are: lossless persistence and ownership; definitions, snapshots and calculations; actions, resources and time; then integrated viewer/editor workflows and audits. Architecture decisions come first. A first implementation milestone and its acceptance criteria still require user agreement.

LLM assistance follows reliable structured data. Q&A should use deterministic values; extraction proposals need source, version, confidence and human review. See [LLM Assistance](../Primary/LLM%20Assistance.md).
