# Carol Elfnein Issues

> **Historical audit, not a current decision queue.** The material below preserves the 2026-10-12 observations and questions. Its class/build-pending statements are superseded by the accepted Evoker Wizard 12 / Alchemist Artificer 3 tabletop build, total level 15. Runtime defects remain open until verified fixed; a new design does not fix stored data. Use the [current sheet](../Character%20Sheets/Carol%20Elfnein.md), [status](../Primary/Carol%20Rebuild%20Status.md) and [campaign architecture](../Systems/Campaigns%20and%20Shared%20Data.md). Retired features below are evidence, not implementation requirements.

## Historical context — 2026-10-12
Carol has been played as a level12 caster with sixth-level spells. Latest clarification: user is reconsidering whether this means Wizard12 plus Sorcerer levels (potential total14), pure Wizard12 with explicit custom features, or an Artificer rebuild. Final class allocation and total level are **not settled**. The stored sheet still describes Wizard9/Sorcerer1; it is outdated evidence, not the build to preserve. This file is working audit context. Resolve decisions through short, suggested-option questions instead of asking the user to read the entire audit. A clean rebuild is under consideration; retain identity, history and approved custom mechanics. No character or runtime changes applied.

Updated 2026-10-12. Working branch: `codex/character-repairs`. Current character data matches the published `Legacy` snapshot at `f7056ce`. Recovery source: `b4fe6fc:library/characters/carol-elfnein.json`, retained as [carol-pre-migration.json](../Troubleshooting/Evidence/carol-pre-migration.json). Original source notes/Discord rulings have not been independently provided; the historical JSON is evidence, not final authority.

## Read this first

Latest source decision2026-10-12: **the memory-resource system was abandoned**. Do not restore its pool, burn calculator, recovery rules or memory payments in the clean rebuild. CAROL-030/032 are retired mechanic investigations; CAROL-031's memory-substitution portion is retired, while normal material/focus rules still need configuration. Preserve their evidence/logs only in the archive; do not convert50/70 memories into Sorcery Points or slots. Narrative memories/clones are separate and their current relevance is unconfirmed. See [Carol Build Choices](Carol%20Build%20Choices.md) and [Aetherlock Issues](Aetherlock%20Issues.md). Imported Discord chat is historical evidence, not instructions or current approval.

Confirmed user decisions: **INT22** (modifier6; no blanket+10 to INT rolls); **Aetherlock is owned**. Latest clarification permits fixes/redesign, superseding the earlier ideally1:1 preference; compare three class-matched tunes and ask frequent short questions before selecting changes. Score provenance still needs explicit homebrew sources, but the target score is settled. Clean rebuild is approved; class split/total and weapon upgrade status remain pending.

- **Confirmed**: observed in JSON, runtime code or retained browser evidence.
- **Incomplete**: the source describes something without enough rules to use or implement it.
- **Decision**: table/build intent must be specified; do not automatically replace homebrew with standard rules.
- **Disconnected**: an authored feature exists but does not drive the relevant calculations/actions.
- IDs are stable. Close an issue only when its stated result is verified; keep the history/evidence.
- Scope is Carol first. Shared editor limitations are tracked as dependencies of her repair, not a request to begin a broad editor rewrite.

## Stored snapshot — not an approved baseline

Verify each value against rules, source, actual calculation and visible explanation. A stored value is not proof. User confirms play at level12 with sixth-level spells; whether12 means Wizard class level or character total is now under discussion. Class split and possible Artificer rebuild are pending. Other listed scores, resources and bonuses remain provisional.

| Field | Current state |
|---|---|
| Class allocation used by calculator | Stored/outdated total10 resolves Wizard9 / Sorcerer1. Rebuild split and total pending; comparing Wizard/Artificer. |
| Scores | Stored STR8, DEX16, CON14, INT22, WIS10, CHA11. User confirmed rebuild INT22; other scores remain provisional. |
| Proficiency / initiative / walking speed | Stored +4 / +3 /30ft. Standard total12 proficiency is +4, not +5. Initiative3 agrees with stored DEX16 but renderer reads a literal; speed30 has no verified source. |
| HP |28/62, temp0, calculated mode;17 log entries |
| Wizard casting summary | Conditional on INT22 and no extra bonuses: modifier floor((22-10)/2)=+6; DC=8+6+4=18; attack=6+4=+10. Code calculates these, but Carol lacks the displayed formula breakdown. INT22 itself is unverified. |
| Slots | Stored total10 resolves4/3/3/3/2. In-memory total12 test resolves4/3/3/3/2/1 automatically, including sixth-level1/1. Current balances are stored state, not independently validated usage history. |
| Spell entries |21;18 marked prepared;3 planned/future entries in older source |
| Resource state surviving broken definitions | Historical Spell Memories50/70 is retired/archive only; Bladesong4/4 and Sorcery Points2/2 need approved feature origins. |
| Resource history | Memory log totals50 correctly;6 entries |
| Identity/history | Personality, backstory, notes and aliases remain present |

No portrait is configured. That is missing optional presentation content, not a failed image URL. The `Carol Elfnien` alias may preserve an intentional old spelling; do not remove it without checking. Empty alignment, zero currency and unknown item weights are not demonstrated bugs.

## Data recovery and provenance

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-001 | Confirmed | **31 unresolved references:** 19 spells,2 items,5 traits,3 resources,2 feats. Restore their definitions and manifest entries; keep current entry IDs, preparation/state, HP and resource logs. A missing reference must not be saved back as an empty replacement definition. Full recovery inventory is below. |
| CAROL-002 | Confirmed | **Fire Bolt and Fireball are malformed canonical records.** Both declare `schemaVersion:1` with empty `features` and `desc`, while rules live in legacy fields. The canonical adapter ignores those fields; both render without rules and Fireball becomes level0. Repair canonical structure, not just the displayed label. |
| CAROL-003 | Confirmed | **Fireball uses a shared2024 record ID for Carol's custom flavor/memory notes.** The manifest now points to a malformed root-level file; a richer same-ID record remains under `spells/evocation`. Define canonical rules once and put Carol's flavor/cost overlay in a character variant or local override. Avoid rewriting other characters' Fireball definitions. |
| CAROL-004 | Confirmed | **Every spell's character-local access is now `{}`.** Historical Current/Future labels, eligibility explanations, `showKnown:false` and chips disappeared. Recover access separately from preparation; unprepared does not mean future, and prepared does not establish eligibility. |
| CAROL-005 | Confirmed | **Dur Da Bla lost its attuned state.** Historical item is attuned; current reference has only active/quantity and empty overrides. Recover attunement as character state and distinguish it from an item's attunement requirement. |
| CAROL-006 | Decision | **Rules version and feature provenance are unresolved.** Fireball's ID says SRD2024; feats and source spell notes resemble older rules; subclass/race/homebrew sources are not recorded. Select a compatible baseline, mark playtest/homebrew exceptions, and retain flavor separately from authoritative rules. |

## Build, spell eligibility and class features

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-007 | Confirmed / user correction | **Stored level10 is outdated; header also mislabels primary levels.** Intended total is12 with sixth-level spell access. Confirm class split, then update build and all dependent values. Header/Identity currently show total as primary level. Keep class levels, total level, slot progression and spell eligibility distinct. |
| CAROL-008 | Decision | **CHA11 versus multiclass prerequisite.** Under2014 multiclass rules, Sorcerer requires CHA13. Determine whether an explicit exemption or different table rule applies; record it. Do not raise CHA or delete Sorcerer automatically. [2014 multiclass rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/customization-options). |
| CAROL-009 | Incomplete / Decision | **Mage of Quandrix is just a subclass string plus Guidance access.** The2021 playtest package also includes other granted content, including Guiding Bolt and Functions of Probability, absent from this sheet. Confirm whether that actual package or a custom adaptation is intended; define only the approved level1 features and future progression. The source explicitly identifies itself as playtest material. [Wizards' Quandrix source](https://media.wizards.com/2021/dnd/downloads/UA2021_06_08_MagesStrixhaven.pdf). |
| CAROL-010 | Disconnected / Incomplete | **Only one casting profile exists.** Wizard INT DC18/+10 is shown for the whole character. Sorcerer-origin spells need their own profile (base CHA DC12/+4 with current scores), or a documented custom substitution. Associate every spell with its casting origin; shared slots must not merge class-specific DCs/known-spell rules. |
| CAROL-011 | Incomplete | **Spellbook, known spells, preparation and grants are conflated.** The source has12 currently prepared leveled Wizard spells, one current Sorcerer leveled spell and five cantrips, plus future entries. It does not document a complete spellbook or Sorcerer selections. Check omitted selections against the chosen build; do not interpret total prepared18 as18 prepared leveled Wizard spells. |
| CAROL-012 | Incomplete / Disconnected | **Core Wizard/subclass features are not configured as a complete package.** Arcane Recovery, spellbook/ritual behavior, weapon/armor training and Bladesinger attack behavior need explicit presence, source and applicability. A class label does not instantiate features. Spellbook and Arcane Recovery are part of the2014 Wizard definition. [Wizard source](https://www.dndbeyond.com/classes/8-wizard). |
| CAROL-013 | Decision | **INT22 and proficiency choices lack allocation history.** Dual Wielder and Metamagic Adept occupy described Wizard4/8 progression; source does not explain INT22, the full skill package or initial-class/racial contributions. Preserve current scores and bonuses while recording their sources; treat unverified allocation as a question, not proof the values are wrong. |

## Spell definitions and use

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-014 | Confirmed | **All21 entries appear under Cantrips.** Unknown levels fall back to0; resolved Fireball also loses level3. Render missing/invalid entries as unresolved, and restore the level distribution listed below. |
| CAROL-015 | Incomplete | **Historical spell descriptions are flavor summaries, not complete rules.** Restoring old JSON alone will not restore targeting, damage, saves, repeat/end conditions, object limits, component costs or upcasting. Populate verified definitions for all21; preserve Carol's alchemical presentation separately. |
| CAROL-016 | Incomplete / Disconnected | **Damage/save/area data is absent or only represented by vague chips.** Burning Hands, Fireball, Rime's Binding Ice, Web and others cannot support reliable attack calculations, effect extraction or recommendations. Define typed dice/scaling, target/area, save ability and outcome rules; a “Control” tag is not a rule. |
| CAROL-017 | Confirmed / Disconnected | **Gameplay exposes slot pools rather than individual casting.** Spending a level does not identify the spell, origin, targets, memory cost, metamagic or active effects. Carol needs a minimal spell-use record connecting those parts; it need not become a new DM system. |
| CAROL-018 | Disconnected | **Concentration, reactions and ongoing effects are descriptive.** Web, Guidance, Hold Person, Wall of Force and Guise need a consistent active-effect/concentration model; Shield and Absorb Elements need triggers and expiry. Define the chosen rules before automating conflicts or treating every listed spell as active. |
| CAROL-019 | Confirmed / Decision | **Historical future labels are outdated and not mechanically separated.** Guise was planned Wizard11 and may now qualify at intended total12, depending on class split/table policy. Prismatic Wall was Wizard17; Enlarge/Reduce was Sorcerer3. Re-evaluate from the approved build and house eligibility rules rather than restore old Current/Future labels verbatim. Possessing sixth-level slots alone does not settle class-specific access. |

## AC, equipment and combat

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-020 | Confirmed | **AC selection changes header text only.** Clicking Bladesong22 leaves Combat Stats16; header tooltip still names Base/Mage Armor. Selection does not update the character or shared calculation. Make mode/source/value agree across every visible summary and define whether selection is preview or persistent activation. |
| CAROL-021 | Decision / Confirmed inconsistency | **Shield + Bladesong25 contradicts stated22+5.**29 is also a provisional future stack. Record the table's intended stack, formulas, constraints and exceptions. With the stored premises, arithmetic gives27 before any other approved effects; do not silently settle the house rule. |
| CAROL-022 | Disconnected | **Mage Armor is assumed always active.** Base16 depends on13+DEX3, but casting/duration/equipment prerequisites are untracked. Provide an inactive/default defense option and a sourced Mage Armor option; do not infer that owning the spell means it is active. |
| CAROL-023 | Disconnected | **AC candidates are hand-entered and incomplete.** Shield without Bladesong is not offered; spells/traits do not generate options. Derive valid candidates from accepted effects, including temporary Shield, and recompute from score changes instead of literal16/22/25/29. Keep exclusive base formulas separate from additive bonuses. |
| CAROL-024 | Disconnected / Decision | **Dual Wielder's+1AC has no relationship to AC modes.** No equipped pair or usable weapon definitions demonstrate that its conditions are met. Determine what Dur Da Bla counts as, then apply the bonus only under the approved equipment/Bladesong rules. |
| CAROL-025 | Incomplete | **Dur Da Bla cutting/binding attacks cannot be used from the sheet.** “Restrain / Bisect” has no attack ability, bonus, damage, range/reach, save/escapeDC, action cost or limits. Booming Blade assumes a weapon delivery but no qualifying weapon is defined. Specify the actual attack/weapon modes rather than turn prose into invented damage. |
| CAROL-026 | Incomplete / Disconnected | **Harp, weapon strings and Faust Robe forms are one active item plus separate traits/spell notes.** No form state, attunement prerequisite, equipped slot or mutual-exclusion relationship exists. Define those relationships and which bonuses require each form. Legendary rarity is descriptive, not a substitute for item rules. |

## Faust Robe, singing, rebirth and resources

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-027 | Confirmed | **Four configured custom calculators never render.** Faust Robe Cast Duration, Transformation Success While Attacked, Faust Robe Memory Burn and Singing Charisma Boost live in `dnd.addons.calculations.rolls`; renderer reads calculators only from bosses. Support Carol's non-boss calculators without adding a fake boss section. |
| CAROL-028 | Incomplete | **Transformation duration/success is not defined by its roll.** `1d20+3` is labelled duration but its note talks about whether transformation holds; no threshold, time unit, outcome table or failure result is supplied. Define what the roll decides and what “up to one minute” means. |
| CAROL-029 | Incomplete | **Interrupted transformation check is only `1d12+2`.** It lacks successDC, trigger frequency, interruption timing, retry/cancellation and whether memories are spent on failure. Link the approved procedure to the transformation state. |
| CAROL-030 | Retired / archive only | **Memory-burn mechanic abandoned by user.** Historical calculator conflicts remain evidence only. Discord source confirms independent d8 rolls minus2 and no net gain; do not repair or port this mechanic into the clean sheet. |
| CAROL-031 | Incomplete / Disconnected | **Material/focus substitution has no executable rules.** Appropriate material can reduce/avoid cost, yet a historic focus-assisted map still costs2. Define adequacy, quantity, consumption, exceptions and whether memory cost supplements or replaces spell slots/material requirements. Do not let a focus bypass costly components by inference. |
| CAROL-032 | Retired / archive only | **Memory-recovery mechanic abandoned by user.** Preserve old logs as history; remove the pool/recovery actions from the clean build. No conversion of historic memory quantities into slots/points is authorized. |
| CAROL-033 | Disconnected / Incomplete | **Bladesong uses4/4 do not drive its effects.** Historical max4 is explicitly a provisional proficiency-based default. Define activation cost/action, duration, reset, ending conditions and all approved benefits/restrictions; then bind use, AC and expiry. `active:true` currently does not establish that a Bladesong is running. |
| CAROL-034 | Incomplete / Disconnected | **Singing's1d8 bonus has no activation or duration.** It describes+1/+2 to Charisma rolls only when singing plausibly matters; no scope for checks versus saves/spellcasting, stacking or memory-cost modifier is specified. Define those boundaries before changing CHA-derived values. |
| CAROL-035 | Incomplete / Disconnected | **Deathless/Reborn is a partial narrative package.** Knowledge from a Past Life+1d6 is not linked to eligible checks, uses or resets; “deathless” prose does not define death/respawn behavior or the intended lineage's other traits. Record the approved lineage and custom rules; do not assume literal immortality from a tag. |
| CAROL-036 | Incomplete / Disconnected | **Metamagic is text plus a2/2 counter.** Quickened/Transmuted have no spell eligibility, cost, action/damage changes or cast linkage. Mark the pool's origin as Metamagic Adept rather than treating it as Sorcerer1 class points; separate future class-point progression and its restrictions. |

## State history, authoring and webpage usability

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-037 | Confirmed / Decision | **HP history is not a replayable account of current state.** Current17 deltas sum36, stored current28. Older11 deltas sum70, older snapshot is58/58. Source level-up note says+16max; current max62 is calculated from the current build. Determine historical snapshots/clamping/max changes; preserve logs and add a reconciliation note, not blindly replace28 with36. |
| CAROL-038 | Incomplete | **Spell-slot history lacks structured direction and spell identity.** Two entries say used/restored level1 only in prose; no signed delta, spell or resulting balance. It is display history, not enough to reconstruct casts/costs. Preserve it and improve future entries without inventing past spell names. |
| CAROL-039 | Confirmed / Disconnected | **Carol's intended mechanics cannot all be maintained through forms.** No general abilities editor; AC form exposes only label/value/active; custom calculators/conditions have no generic authoring path. Spell/item/feat harvesting drops metadata, and conversion can corrupt canonical records. Record these narrow dependencies as her formats are designed, then verify no-change round trips before persisting her repair. Broad editor repair remains deferred. |
| CAROL-040 | Confirmed / Usability | **The page presents invalid entries like ordinary usable records.** Prepared dots and Cantrip labels accompany missing rules; repeated placeholders hide actual names, detail windows lack definitions, feats lack matching View/provenance controls, and the sheet has no spell search or current/future filter. Distinguish owned/available from currently active features; expose rule sources and unresolved status, with compact lists. Mobile wraps correctly but later tabs are hidden behind a horizontal rail with a weak scroll affordance. |
| CAROL-041 | Confirmed | **Resource history IDs are regenerated on every form harvest.** `EditorResources.readTab` reconstructs displayed log entries with `Schema.generateId()`, even with no changes. Carol's six memory entries therefore lose stable identity on editing/saving. Preserve original log IDs so later reconciliation or references can distinguish retained entries from new events. |

## Follow-up findings and decisions

| ID | Type | Problem / required result |
|---|---|---|
| CAROL-042 | Confirmed | **Casting explanations are boss-only.** `getSpellcastingPair` builds score/modifier/proficiency breakdowns, but `renderCombatBlock` calls `renderRollCalculator` only when a boss exists. Carol displays INT22/+6 separately and plain DC18/+10 totals. Show one connected explanation: score22 → modifier6; total12 → proficiency4; DC8+6+4; attack6+4; include sourced extra bonuses. |
| CAROL-043 | Confirmed / unverified provenance | **Proficiency, initiative and speed are literals.** Renderer reads `dnd.proficiencyBonus`, non-boss initiative returns stored `dnd.initiative`, and speed is directly displayed. Level changes do not prove these update. Derive proficiency from total level (levels9–12:+4,13–16:+5), initiative from approved modifiers and speed from approved lineage/effects; retain explicit, explained overrides. |
| CAROL-044 | Runtime verified / incomplete | **Slot calculation scales; full workflow remains unverified.** Executed actual `DndCalculations.resolveSpellSlots` on a cloned current character: total10→4/3/3/3/2, total12→4/3/3/3/2/1, total13→4/3/3/3/2/1/1. Fallback class progression, no library loaded; existing calculated mode. No saved data changed. Existing current counts are preserved/clamped; newly unlocked pools default full. Verify library-loaded editor save/reload and visible summaries during repair. Slot capacity does not itself grant spells or refill spent slots. |
| CAROL-045 | User policy / pending design | **Spell selection must follow the table's broad eligibility rule.** User permits eligible class-tagged spells at an unlocked spell tier without separate learning. Record this as house policy, not a defect against standard learning rules. Proposed universal spellbooks contain imported spells for every caster, including classes that normally need none. Keep global availability, book membership and equipped/prepared selection distinct. Book capacity, equipped cap, multiple-book handling and whether tier access follows class level or combined slots remain undecided; ask short questions before implementation. |

### Rules answers checked

- Standard proficiency at total12 is+4; it becomes+5 at13. INT22 gives+6. These rules validate arithmetic, not Carol's score provenance. [Ability modifiers](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/using-ability-scores), [class/proficiency table](https://www.dndbeyond.com/classes/6-sorcerer).
- Spell-slot/point conversion requires **Sorcerer2 / Font of Magic**, not Sorcerer1. Metamagic Adept's two points are restricted to Metamagic; that feat does not grant conversion. 2014 class Metamagic starts at3; 2024 starts at2. Identify approved edition before wiring features. [2014 Sorcerer](https://www.dndbeyond.com/classes/6-sorcerer), [2024 Sorcerer](https://www.dndbeyond.com/classes/2190884-sorcerer).
- Total12 full-caster slots are4/3/3/3/2/1. Class-specific spell access is a separate question, especially Wizard10/Sorcerer2 versus Wizard11/Sorcerer1; user house rules may intentionally change it. [Multiclass spellcasting](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/customization-options).

## Where to look (source pointers)

| Concern | Source / function |
|---|---|
| Current build/state | `library/characters/carol-elfnein.json` |
| Recovery definitions | Historical commit `b4fe6fc`; retained `../Troubleshooting/Evidence/carol-pre-migration.json` |
| Current spell record failures | `library/records/spells/elfnein-spell-fire-bolt.json`, `library/records/spells/open5e-spells-srd-2024-fireball.json`, `library/manifest.json` |
| Richer Fireball to compare | `library/records/spells/evocation/open5e-spells-srd-2024-fireball.json` (verify source/version before reuse) |
| Canonical normalization | `data/common/scripts/importers/library-records.js`: `normalizeRecord`, `legacyFeatures` |
| Resolve/save migration | `data/common/scripts/library.js`: `resolveCharacterSync`, `syncCharacter`, `recordFromCharacterEntry`, `spellState`, `itemState` |
| Class allocation/HP/slots | `data/common/scripts/dnd-calculations.js`: `getClassLevels`, `calculateHitPoints`, `resolveTamedHp`, `resolveSpellSlots` |
| Header/Identity class labels | `data/common/scripts/views/view-character-header.js`, `view-character-identity.js` |
| AC/custom calculators/casting | Same views folder, `view-character-dnd.js`: `wireInteractive`, `renderCombatBlock`, `renderRollCalculator`, `getSpellcastingPair` |
| Spells/trait/item/resource display | Same views folder, `view-character-spells.js`, `view-character-abilities.js`, `view-character-inventory.js`, `view-character-resources.js` |
| Generic detail window | Same views folder, `view-character-utils.js` |
| Form harvesting | `data/editor/scripts/editor-mount.js`, `editor-spells.js`, `editor-inventory.js`, `editor-dnd.js`, `editor-resources.js` |
| Cast/slot history | `data/editor/scripts/editor-gameplay.js`: `adjustSpellSlot`, `addSpellLog`; current Gameplay renderer |

## Evidence retained

- [Original character recovery snapshot](../Troubleshooting/Evidence/carol-pre-migration.json).
- [Resolved runtime data](../Troubleshooting/Evidence/composition-resolved.json), [first audit results](../Troubleshooting/Evidence/results.json).
- [AC mismatch screenshot](../Troubleshooting/Evidence/carol-mobile.png), [false cantrip list screenshot](../Troubleshooting/Evidence/carol-mobile-spells.png).
- `../Troubleshooting/Evidence/carol-*.txt`: all eight tabs inspected in the previous browser audit. Production runtime has not changed since that check; this pass traced data/history/source rather than repeating unchanged browser tests.
- [Broader composition audit](../Troubleshooting/CHARACTER_COMPOSITION_AUDIT.md) for shared behavior and comparisons. Its C01–C10 findings are expanded here.

## Repair discussion order

1. Recover Carol's intended definitions/current-versus-future inventory using the exact manifest below.
2. Settle class/rules provenance, AC stacking and retained Faust transformation rules. Memory-cost/recovery mechanics are retired; do not rebuild them.
3. Define connected item/forms, casting origins, effects and resource relationships for her build.
4. Implement those Carol repairs with the narrow preservation changes they require; check all tabs and histories.
5. Complete canonical spell rules and usability feedback; run round-trip and rendering verification before marking issues closed.

A successful repair keeps current state/history, removes all unresolved references, displays real spell levels/rules, makes AC/casting/form summaries agree, and labels undecided homebrew explicitly. Data recovery and approved rule decisions must remain distinguishable.

## Recovery inventory

The table below is generated from the historical entries and current references. Its spell levels/access describe the historical intended build, not verified complete rules. The old ID for Carol's Fireball was `elfnein-spell-fireball`; the current reference uses a shared2024 ID instead.

### Spells (21)

| Name | Level | Original access | Current result / reference |
|---|---:|---|---|
| Fire Bolt | 0 | Current; prepared | Malformed canonical record — `elfnein-spell-fire-bolt` |
| Create Bonfire | 0 | Current; prepared | Missing — `elfnein-spell-create-bonfire` |
| Ray of Frost | 0 | Current; prepared | Missing — `elfnein-spell-ray-of-frost` |
| Booming Blade | 0 | Current; prepared | Missing — `elfnein-spell-booming-blade` |
| Mage Armor | 1 | Current; prepared | Missing — `elfnein-spell-mage-armor` |
| Shield | 1 | Current; prepared | Missing — `elfnein-spell-shield` |
| Chromatic Orb | 1 | Current; prepared | Missing — `elfnein-spell-chromatic-orb` |
| Burning Hands | 1 | Current; prepared | Missing — `elfnein-spell-burning-hands` |
| Catapult | 1 | Current; prepared | Missing — `elfnein-spell-catapult` |
| Web | 2 | Current; prepared | Missing — `elfnein-spell-web` |
| Hold Person | 2 | Current; prepared | Missing — `elfnein-spell-hold-person` |
| Rime's Binding Ice | 2 | Current; prepared | Missing — `elfnein-spell-rimes-binding-of-ice` |
| Fireball | 3 | Current; prepared | Malformed canonical record — `spells.open5e-spells-srd-2024-fireball` |
| Tidal Wave | 3 | Current; prepared | Missing — `elfnein-spell-tidal-wave` |
| Wall of Force | 5 | Current; prepared | Missing — `elfnein-spell-wall-of-force` |
| Steel Wind Strike | 5 | Current; prepared | Missing — `elfnein-spell-steel-wind-strike` |
| Tasha's Otherworldly Guise | 6 | Future; unprepared | Missing — `elfnein-spell-tashas-otherworldly-guise` |
| Prismatic Wall | 9 | Future; unprepared | Missing — `elfnein-spell-prismatic-wall` |
| Guidance | 0 | Current; prepared | Missing — `elfnein-spell-guidance` |
| Absorb Elements | 1 | Current; prepared | Missing — `elfnein-spell-absorb-elements` |
| Enlarge/Reduce | 2 | Future; unprepared | Missing — `elfnein-spell-enlarge-reduce` |

### Other missing definitions (12)

| Section | Name | Current reference |
|---|---|---|
| inventory | Dur Da Bla | `elfnein-item-dur-da-bla` |
| inventory | Silver / Gold Alchemical Focus | `elfnein-item-silver-gold-focus` |
| abilities | Alchemy, Not Magic | `elfnein-trait-alchemy` |
| abilities | Bladesong / War and Song | `elfnein-trait-bladesong` |
| abilities | Siren-Like Singing | `elfnein-trait-song-charisma` |
| abilities | Deathless Reborn Nature | `elfnein-trait-deathless` |
| abilities | Dur Da Bla: Faust Robe | `elfnein-trait-faust-robe` |
| customResources | Spell Memories | `elfnein-resource-spell-memories` |
| customResources | Bladesong Uses | `elfnein-resource-bladesong` |
| customResources | Sorcery Points | `elfnein-resource-sorcery-points` |
| feats | Dual Wielder | `elfnein-feat-dual-wielder` |
| feats | Metamagic Adept | `elfnein-feat-metamagic-adept` |

All12 entries in the second table are unresolved. Their current character-local state may survive even though definitions do not. Preserve resource counters/logs; recover the item/trait/feat rules and Dur Da Bla attunement.

