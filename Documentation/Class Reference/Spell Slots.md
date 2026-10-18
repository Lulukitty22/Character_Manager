# Spell Slots

Slots are casting capacity, not spells learned/prepared and not class features. This table is generated from the current shared calculator and cross-checked against published full-caster progression; Artificer is half rounded up for combined casting. Trailing zero tiers are omitted. Level0 has no class slots. PB here assumes a pure-class character; multiclass PB uses the sum of actual class levels. [2024 class tables](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes), [multiclass overview](https://www.dndbeyond.com/posts/1035-artificer-201-a-guide-to-multiclassing).

<!-- SLOTS_TABLE -->
| Class level | Pure-class PB | Wizard/Sorcerer slots (1→9) | Artificer slots (1→5) |
|---|---|---|---|
| 0 | — | — | — |
| 1 | 2 | 2 | 2 |
| 2 | 2 | 3 | 2 |
| 3 | 2 | 4/2 | 3 |
| 4 | 2 | 4/3 | 3 |
| 5 | 3 | 4/3/2 | 4/2 |
| 6 | 3 | 4/3/3 | 4/2 |
| 7 | 3 | 4/3/3/1 | 4/3 |
| 8 | 3 | 4/3/3/2 | 4/3 |
| 9 | 4 | 4/3/3/3/1 | 4/3/2 |
| 10 | 4 | 4/3/3/3/2 | 4/3/2 |
| 11 | 4 | 4/3/3/3/2/1 | 4/3/3 |
| 12 | 4 | 4/3/3/3/2/1 | 4/3/3 |
| 13 | 5 | 4/3/3/3/2/1/1 | 4/3/3/1 |
| 14 | 5 | 4/3/3/3/2/1/1 | 4/3/3/1 |
| 15 | 5 | 4/3/3/3/2/1/1/1 | 4/3/3/2 |
| 16 | 5 | 4/3/3/3/2/1/1/1 | 4/3/3/2 |
| 17 | 6 | 4/3/3/3/2/1/1/1/1 | 4/3/3/3/1 |
| 18 | 6 | 4/3/3/3/3/1/1/1/1 | 4/3/3/3/1 |
| 19 | 6 | 4/3/3/3/3/2/1/1/1 | 4/3/3/3/2 |
| 20 | 6 | 4/3/3/3/3/2/2/1/1 | 4/3/3/3/2 |
<!-- SLOTS_TABLE_END -->

## Separate these four concepts in the rebuilt sheet

1. **Character total:** sum of actual class levels; determines PB and many cantrip scaling checkpoints.
2. **Class level:** grants features, preparation allowances and spell tiers for that class.
3. **Combined casting:** Wizard+Sorcerer+ceil(Artificer/2) gives shared slot table; no other classes considered here.
4. **Casting origin:** each spell has its own class/item source and casting ability; shared slots do not merge those rules.

Wizard9/Artificer3 gives caster11: a sixth-tier slot, but only fifth-tier Wizard and first-tier Artificer spells. Table-policy automatic access applies within approved class tags/tiers, not by treating caster11 as Wizard11. Slots spent to load Aetherlock must remain spent until recovered; stored rounds need their own capacity/consumption state.

Numeric generation uses class fallback progression and no loaded library. This verifies slot arithmetic, not the editor, final2025 plan counts, item bonuses, active effects or preparation rules. Re-run `node "Documentation/Class Reference/build-reference.cjs"`; only marked numeric tables and Comparison Data.json are regenerated. Handwritten analysis remains intact.
