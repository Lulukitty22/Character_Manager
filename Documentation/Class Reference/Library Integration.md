# Class Library Integration

The class comparison is documentation, not runnable character data. Reusable class/subclass records should eventually drive feature unlocks, spell eligibility and resource limits. Carol's tabletop baseline is accepted. Current design includes DM/party-aware casting and campaign architecture; wider archived DM expansion remains deferred. Lossless persistence is required before migration.

## Existing locations / gaps

| Pointer | Discovery |
|---|---|
| `library/records/classes/wizard.json`, `sorcerer.json` | Existing records contain basic metadata/progression, not a complete2024 level feature catalogue. |
| `library/records/classes/` | No Artificer record in the current folder. Calculator fallback recognition is not a usable Artificer class library. |
| `library/manifest.json` | No dedicated subclass collection; importing a subclass requires a deliberate representation and loader path. |
| `data/common/scripts/dnd-calculations.js` | Shared slot arithmetic; includes class fallbacks. Its hit-die reader expects root `hitDie` or `addons.hp.hitDie`, while current records store `features.class.hitDie`. Known names can mask this mismatch through fallbacks. |
| `Documentation/Issues/Carol-Elfnein Issues.md` | Production calculation/UI/source problems and stable issue IDs. |
| `Documentation/Class Reference/build-reference.cjs` | Documentation table generator; reads calculator with a minimal Schema stub, no Library. Does not verify loaded records or UI behavior. |

Re-check loader/schema paths before implementation; the record mismatch above must not become another silent fallback in Carol's rebuild.

## Minimum reusable information

Each feature needs class/subclass identity, publication/version, minimum **class** level, prerequisite, calculation/effect, action/trigger, resource/cap/reset and source pointer. Track whether it is published, playtest, approved homebrew or unresolved. A readable paragraph is not executable eligibility.

Each spell needs class tags and grant source, edition, tier, action, attack/save, damage/healing, duration/concentration, components and costs, scaling, and structured effects where confidently verified. Preserve its full definition alongside normalized values. AC base formulas, conditional bonuses and reaction bonuses require different types; parsing '+5 AC' must not create a permanent always-on bonus.

Class level, character total, effective caster level and spell casting origin must remain separate. Stored rounds/items need independent capacity and consumed state. Shared slots need one authoritative pool, with preparation and known/eligible catalogues separately tracked.

## Draft sequence / acceptance evidence

1. Use the accepted sheet and source map for editions, class split, subclass and campaign preparation rules. Resolve only genuinely open details; do not restart settled choices.
2. Verify the missing final published limits; encode small source-backed records for the selected build first.
3. Implement from the accepted tabletop sheet after architecture and persistence dependencies are ready; preserve the origin of every statistic, feature and resource.
4. Verify the rendered page: formulas visible, correct feature gating, spell definitions accessible, gun loaded/empty states clear, conditional effects scoped.
5. Verify changing levels recalculates slots and eligibility; spending/resting resources and saving/reloading preserve correct state.

LLM review can later suggest malformed definitions or candidate effects. A confidence number is not evidence that a modifier is correct; validated source/structured data should answer simple questions such as spell DC. Keep that broader assistance work on hold until Carol's data is trustworthy.
