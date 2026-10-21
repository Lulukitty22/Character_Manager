# Carol repair findings

This file owns the remaining Carol-specific runtime defects and stable CAROL issue IDs. Findings were observed on 2026-10-12; documentation consolidation on 2026-10-18 is not a new runtime audit or a claim that defects are fixed. The accepted [tabletop sheet](../Character%20Sheets/Carol%20Elfnein.md) supersedes old build questions; the [runtime guide](../Implementation/Runtime%20and%20Repair%20Guide.md) owns code paths and verification order.

## Status

The tabletop build, skill choices, spell package and weapon baseline are settled. Production character JSON is still older. Preserve recoverable data and history, but do not restore retired equipment/features merely to eliminate a missing reference. Open work is lossless persistence, correct source resolution, derived state, resource/event workflows and actual viewer/editor verification.

## Current findings by original ID

| ID | Remaining issue or disposition |
|---|---|
| CAROL-001 | The audited save had 31 unresolved references. Recover approved definitions/state without replacing missing records with empty definitions or reviving retired content. |
| CAROL-002 | Fire Bolt/Fireball declared canonical schema with empty features/rules while legacy fields held content; repair record structure, not only labels. |
| CAROL-003 | Shared Fireball identity points to malformed root data while richer unlisted evocation data exists. Preserve shared rules and separate character flavor; local customization is now a wholly independent definition, not field inheritance. |
| CAROL-004 | Spell access metadata became empty. Keep casting origin, eligibility, readiness and historical/future labels distinct; do not restore outdated permissions verbatim. |
| CAROL-005 | Owned attunement state was lost in conversion; verify preservation through save/reload. |
| CAROL-006 | Edition/source decisions are settled in the build reference; their provenance must still reach runtime records. |
| CAROL-007 | Stored class allocation is obsolete and header treats total level as primary class level. Migrate to the accepted sheet, then verify every dependent view. |
| CAROL-010 | One global casting profile cannot represent distinct origins, item bonuses or stored snapshots. Shared slots do not merge those statistics. |
| CAROL-011 | Known, acquired, ready, class-granted and future content were conflated. Use selected container/eligibility rules, not the obsolete prepared-count assumptions. |
| CAROL-012 | A class label does not instantiate complete features. Configure accepted class/subclass features, limits, prerequisites and sources. |
| CAROL-013 | Stat/skill sources are now mapped; retain them during migration rather than guessing from final values. Indomitable is already included in INT. |
| CAROL-014 | Unknown/malformed spell levels displayed as usable-looking cantrips. Show unresolved data explicitly. |
| CAROL-015 | Old flavor descriptions are incomplete rules. Approved entries need verified targeting, saves, components, scaling and endings. |
| CAROL-016 | Tags/chips are not executable damage, area or save rules. Structured effects need reviewed provenance. |
| CAROL-017 | Slot-spend controls do not identify actual spell, origin, targets or outcomes. Implement the selected shared request/reservation/resolution flow. |
| CAROL-018 | Concentration, Reactions and durations need connected active state rather than prose-only effects. |
| CAROL-019 | Re-evaluate old Current/Future labels against accepted class access; high shared slots alone do not unlock class spells. |
| CAROL-020 | AC selection changed the header only, leaving combat values/tooltips inconsistent. Use one resolved state and distinguish previews from activation. |
| CAROL-021 | Runtime must use the accepted sheet's sourced AC formulas consistently across views. |
| CAROL-022 | Merely listing Mage Armor must not make it permanently active. Track activation, duration and equipment conditions. |
| CAROL-023 | Derive valid AC options from exclusive bases and additive effects, rather than literal hand-entered totals. |
| CAROL-024 | Conditional equipment bonuses need explicit prerequisites. |
| CAROL-026 | Guise is a spell; connect its selected behavior to active state. |
| CAROL-027 | Non-boss custom calculators were unreachable because only boss render paths invoked them. Retain the generic rendering defect for verification. |
| CAROL-031 | Required/consumed components and tool/focus handling need correct runtime modeling. |
| CAROL-037 | Historical HP deltas do not reconcile with stored balances. Preserve audit evidence and handle maximum changes/clamping explicitly; do not replace current HP with a historical sum. |
| CAROL-038 | Slot history lacks signed deltas, spell identities and resulting balances. Preserve it without inventing past casts. |
| CAROL-039 | Editor lacks generic abilities authoring and drops spell/item/feat metadata. Verify meaningful no-change round trips before migration. |
| CAROL-040 | Missing rules look usable; source drill-down/search/filtering and mobile tab affordance need improvement. Rendering success is not correctness. |
| CAROL-041 | Resource history IDs were regenerated on every harvest, including unchanged entries. Preserve identity even for retained retired-resource logs. |
| CAROL-042 | Casting formula explanations were boss-only; connect scores, modifiers, proficiency, source bonuses and totals for ordinary PCs. |
| CAROL-043 | Proficiency, initiative and speed were stored literals. Derive them from accepted sources/effects with explicit explained overrides where needed. |
| CAROL-044 | Fallback-only slot tests scaled correctly at old totals 10/12/13. Existing current balances were preserved/clamped and newly unlocked pools defaulted full; that observed behavior still requires loaded-library/editor verification and must not be mistaken for the selected no-free-refill policy. Capacity is separate from eligibility. |
| CAROL-045 | Broad class-tier book eligibility, capacity and readiness are now selected in the container design. Implement them without another hidden learning/preparation gate. |

## Recovery evidence and completion

[carol-pre-migration.json](Evidence/carol-pre-migration.json) preserves older inline content; [composition-resolved.json](Evidence/composition-resolved.json) preserves resolved audit data; [results.json](Evidence/results.json) records reproduced failures. Exact historical reference IDs, access flags and resource histories remain in those snapshots; do not duplicate a second inventory here. The alias `Carol Elfnien` may be intentional. No portrait, empty alignment, zero currency and unknown weights are not demonstrated defects by themselves.

Issue IDs omitted from this table concerned abandoned character design rather than remaining runtime work. Historical evidence is retained to reproduce application defects; migrate only the accepted current sheet and its approved definitions.

Completion requires preserved meaningful state/history, valid approved definitions, real spell levels, consistent derived views, lossless save/reload and verified gameplay/resource behavior. Retired-policy questions are closed by selection, while runtime defects remain open until tested. See [Character Audit](Character%20Audit.md) for Capella/Seraphine and [Runtime Audit](Runtime%20Audit.md) for shared failures.
