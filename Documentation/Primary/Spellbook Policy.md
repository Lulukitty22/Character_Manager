# Spellbook Policy

Updated 2026-10-18. This is the campaign readiness policy and an index to the [container/scroll design](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md), which owns the detailed lifecycle, costs and access rules. No book/container implementation or character migration has occurred.

## Selected readiness rules

- Each ordinary campaign spellbook holds 16 entries, including cantrips. Every contained eligible spell is ready. Multiple books add capacity without another character-wide preparation cap.
- All classes store spells in book items. Names and tab order are editable and saved. Opening a book displays contents; it does not activate an item or refill resources.
- Books do not grant new class cantrip choices, class access, spell tiers or slots. Wizard 12 / Artificer 3 has Wizard access through level 6 and Artificer through level 1; higher shared slots support eligible upcasts.
- The user permits a spell in a book if the character can cast it under the applicable class/level rules. Do not require an additional learning step merely to establish eligibility. Physical acquisition, scribing and mounting remain distinct operations with their selected costs.
- Cantrips occupy normal spaces. Carol's three permanent Enduring books contain Combat 16, Cantrips 10 and Workshop/Alchemy 6 entries. See [Books and Grants](../Class%20Reference/Carol%20Books%20and%20Grants.md) for spell lists and source grants.
- Preserve casting time, components, range, concentration, saves, effects and stacking unless explicitly changed. The 16-entry/all-ready system is a campaign rule, not standard published preparation. No secondary-book penalty is selected.

## Scroll use and persistence

There is one physical scroll type. Binder casting uses the current caster's eligibility, statistics and resources while preserving the item and original snapshot. Loose/Spellround use consumes the prepaid scroll under its source rules and uses the original snapshot. Moving or mounting never duplicates the item or upgrades its saved cast.

Use the [canonical lifecycle](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md#one-physical-scroll--selected-2026-10-17) for scribing, mounting/removal, Arcana costs and their exceptions. Stable instance identity, source/version and casting origin must survive editor harvesting and conversion. Derive readiness from accessible eligible contents without adding a hidden global preparation filter.

## Remaining design work

Physical access depth, nonempty deletion and capacity override policy are selected in the container document. Open questions concern movement/retrieval actions, ritual entries, duplicate spell identities with different sources, class-granted spells when a book is lost, and migration/UI details. The three-book layout and single-scroll model are settled.

Source for comparison: [2024 class rules](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes). Explicit campaign rules take precedence where different.
