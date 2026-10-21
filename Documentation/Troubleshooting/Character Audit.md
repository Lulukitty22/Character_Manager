# Second audit: Carol, Capella, Seraphine

This report preserves character/runtime observations from 2026-10-12; it is not a new audit. Its C/K/S issue IDs and evidence remain useful, but later selected builds and Systems policies supersede its old design questions. Current Carol dispositions are in [Carol Repair Findings](Carol%20Repair%20Findings.md); repair dependencies belong in the [Runtime and Repair Guide](../Implementation/Runtime%20and%20Repair%20Guide.md).

2026-10-12. Scope: character repairs, composition, rendered webpages, missing and disconnected features. No DM/party expansion. No production character data or runtime changed.

These sheets render successfully, but rendering success does not establish correctness. Carol has broken library migration; Capella has several incompatible numerical definitions; Seraphine has an incomplete spell catalogue and build. All three are affected by editor/schema gaps and display-only mechanics.

## Evidence and coverage

Used the latest GitHub staging snapshot retrieved during the first audit (f7056ce, June 6) over the older local data. Runtime files are unchanged between those snapshots. Carol's older local inline character retains recovery material that the latest references no longer resolve. See `remote-snapshots.json`, `composition-resolved.json`, and the first `Runtime Audit.md` for repository history/save-pipeline evidence.

Inspected all eight visible tabs for each character: Identity, D&D Stats, D&D Gameplay, Abilities & Feats, Spells, Resources, Notes, plus Inventory for Carol/Seraphine and Combat for Capella. Saved 24 browser accessibility observations alongside this report. Tested Capella's boss-to-tamed preview, Carol's AC selection, Seraphine's spell detail modal, and a no-save editor harvest. Inspected desktop and 390px-wide layouts. Generated local pages use the actual viewer/editor modules and latest seeded library data, not a replacement implementation.

Screenshots: `carol-mobile.png` demonstrates inconsistent AC between header and Combat Stats; `carol-mobile-spells.png` shows missing records grouped as cantrips; `seraphine-empty-spell-modal.png` shows the empty definition; `seraphine-mobile-inventory.png` shows bespoke inventory descriptors. `seraphine-editor-roundtrip.json` records the destructive form harvest. The editor harness lacks manager chrome; its unrelated app-init error is a harness limitation, not a production finding.

Severity: P0 = data preservation/recovery prerequisite; P1 = incorrect or unusable gameplay information; P2 = incomplete authoring/usability/support. Numbers below describe what the application currently does, not a ruling on intended homebrew balance.

## Carol

| ID | Priority | Finding and repair direction |
|---|---|---|
| C01 | P0 | The audited character has 31 unresolved references: 19 spells, 2 items, 5 traits, 3 resources, 2 feats. Names/rules disappear behind “Missing record” placeholders. Create valid approved definitions and repair manifest references for the accepted current sheet; historical inline content is defect evidence, not a build to restore. |
| C02 | P1 | The two resolved spells, Fire Bolt and Fireball, have empty definitions. Fireball resolves as level0. All21 spells appear under Cantrips, including missing entries whose unknown levels are silently defaulted to0. Missing/invalid records must render as unresolved, never as usable cantrips. |
| C03 | P1 | The stored `dnd.level` means total level but the header and identity treat it as primary-class level before appending additional classes. Show class allocation explicitly. |
| C04 | P1 | Selecting an AC option updates only header AC; Combat Stats and its tooltip retain a different value/source. Selection is temporary CSS/text, not a shared resolved state. |
| C05 | P1 | Authored AC totals disagree with their formulas and include effects without tracked activation, duration or eligibility. Verify against the accepted sheet and selected active-state rules. |
| C06 | P1 | Calculators stored under `dnd.addons.calculations.rolls` are unreachable because the renderer only invokes the calculator for bosses and reads `boss.addons`. Generalize the supported calculator format. |
| C08 | P1 | One character-wide casting profile cannot represent distinct spell origins, abilities and feature bonuses. Resolve the profile from each source. |
| C09 | P2 | Historical forms and resource pools are separate descriptions/counters/AC rows. No declared relationships activate effects, spend appropriate pools, distinguish casts or remove effects. Retain the generic need for connected effects; do not restore retired character mechanics. |
| C10 | P2 | Ability grants, spell access and custom equipment need explicit provenance/rules-version/table-permission fields. High stats/homebrew are not inherently bugs. Migration lost spell access distinctions; future content must not look currently castable. |

The omitted C07 concerned abandoned character mechanics. Exact historical inputs remain in audit evidence for reproducing runtime defects; they are not a character build to restore.

## Capella

| ID | Priority | Finding and repair direction |
|---|---|---|
| K01 | P1 | Boss toggle lives only in Combat. It changes CSS and selected numbers, but searches obsolete HP selectors. In tamed preview Stats still displays210HP and header remains66HP/AC19/initiative+1. Tamed Stats AC11/init-3/DC15 do change. Move state control to shared header and render every value from one state object. |
| K02 | P1 | Tamed HP has competing sources: stored/default66, calculator104, narrative66; boss narrative210. Missing HP mode makes a generic level20/d10 fallback override the authored tamed pool. Explicitly model the custom body/pool rather than infer a PC progression from the class label. |
| K03 | P1 | Base scores6/5/8/1/9/10 are used as actual scores; adding boss bonuses gives12/10/16/2/18/20. Other content assumes boss DEX18/+4, CON+5, and much higher casting. Establish intended base scores versus bonuses before recalculating. Current INT2/-4 is real rendered output. |
| K04 | P1 | AC14/19 descriptions assume DEX+4, while actual boss DEX10 gives+0. Tamed AC11 assumes DEX+1 while actual DEX5 gives-3. Boss HP explanation uses CON+5 while actual CON16 gives+3. These are copied literal values, not evaluated formulas. |
| K05 | P1 | Old ability records advertise save DC25, attack+17 and different saving throws. Live calculator says DC20/attack+12. Attack JSON still stores+17/+12 but formula rendering yields+12/+7. The editor edits a stored number that the formula can ignore. Replace duplicate “Roll Calculator” traits with computed summaries and make formula versus override explicit. |
| K06 | P1 | Tamed social calculator keeps hardcoded CHA+5 and prepared+15/improv+5, despite tamed CHA10/+0. Custom Stealth explanation uses DEX+1 while actual modifier-3. Main skill list and custom rolls disagree. Formula components must reference resolved attributes. |
| K07 | P1 | Blanket advantage is explicitly authored: “Advantage on All Rolls” applies attacks, saves, checks and contests during Boss Presence. It is not an accidental inference. Implementation only marks all saves and selected skill overrides; ordinary checks omit it. Attacks also have unconditional `advantage:true`. Define scope/exceptions/condition once, and resolve consistently. A narrower intended rule requires a homebrew ruling, not an automatic nerf. |
| K08 | P1 | Tamed Combat becomes an otherwise empty panel because all attacks are boss-only, despite authored tamed attack bonuses. Decide which attacks remain usable in tamed form and render them accordingly. Ability cards remain “Active” for boss-specific traits even after preview turns off. |
| K09 | P1 | Inactive Spider Body/Aquatic Shape still contribute displayed climb/swim30. Fly40 also persists tamed. Bestial Maw is inactive but Bite remains offered in boss attacks; Armored Flesh is selectable independently of trait activation. Trait flags do not drive effects. |
| K10 | P2 | Active-trait counter2/3 is independent from the two active polymorph flags and suggested limit3; legendary counter1/1 is independent from attack economy/round reset. Currently coherent starting numbers can drift. Derive counts or link transitions. |
| K11 | P1 | Slot calculation ignores the authored level1–9 pool because the custom class has no casting progression and slot mode defaults to calculated. An explicit custom casting configuration is required. Boss-only Dominate Monster access is a descriptive label, not a gate. |
| K12 | P1 | Most official-named spells retain casting metadata but replace functional rules with short flavor notes. Hold Monster, Counterspell, Power Word Stun, etc. are not complete definitions. Keep canonical rules plus a separate character flavor/house-rule overlay. Custom Voice of Distortion and attack riders retain fixed DC25/20 independently of displayed global DC20. Mark fixed versus derived DC explicitly. |
| K13 | P2 | A custom level10 spell has range “69” without units and no matching normal slot tier. This is an unsupported homebrew definition needing explicit access/cost/targeting validation, not silent normalization to an ordinary spell. |
| K14 | P2 | Several source documents claim D&D5eAPI while linking to Fandom; other custom rules borrow unrelated official names. Provenance must distinguish authoritative definition, inspiration, custom variant and external link. Garbled `â€”` appears in two ability names. |
| K15 | P2 | Regeneration30, radiant/critical suppression, death/reform105, target study, Silver Tongue floor and party exceptions are predominantly prose. No shared effect/condition model ties these together. Preserve explicit special rulings and expose their conditions; do not pretend the counters enforce them. |

Capella's portrait loads. Defences and visible ability score spans respond to preview, so the toggle is partially wired rather than completely inert. The one legendary full Action producing two attacks is explicitly homebrew and internally explains the5-attacks/round summary; do not treat it as an accidental standard legendary-action rule.

## Seraphine

| ID | Priority | Finding and repair direction |
|---|---|---|
| S01 | P1 | All95 spell entries have empty descriptions, casting times, ranges and durations. Most fields are catalogue labels/access chips. Opening Guidance's View modal reveals chips/Metadata JSON without spell rules. Definitions must be completed against a chosen rules version and custom permissions. |
| S02 | P1 | AC16 is explicitly “assumed”; robes are symbolic, and no armor/shield explains it. Show this as unverified until equipment or a house-rule source is specified. |
| S03 | P1 | Guardian's Shield describes a once-per-long-rest Shield cast/+5AC and has a1/1 pool, but no AC reaction option. Add a sourced conditional option (21 if base16 is accepted), linked to reaction duration and that resource. Do not conflate racial free casting with ordinary slot casting. |
| S04 | P1 | Sentinel's Intuition's extra d4 is not reflected in Insight/Perception summaries. A flat bonus would also be wrong: expose “+8 plus optional1d4” and its source. Vigilant Guardian's reaction and its resource are disconnected. |
| S05 | P2 | Cleric9 has no subclass/domain, class feature package, Channel Divinity or hit-die pool configured. Domain spell access/features cannot be verified yet. This is incomplete composition, not proof that a particular subclass is required. |
| S06 | P2 | Dragonmark appears as feat and general trait, with constituent features repeated. Ability increases are explicitly already included in scores. A future effect engine must not apply them twice. Model package/member relationships. |
| S07 | P2 | Fading Grace explicitly has undefined mechanics; Overhelp Strain is an optional narrative counter and vow is an RP constraint. Label unfinished/narrative status and keep them out of numerical effect generation until specified. |
| S08 | P0 | No-change editor harvest changes Priestess Robes from `clothing` to `weapon`: clothing is outside `Schema.ITEM_TYPES`, so the select picks its first option. Preserve unknown types and add the correct supported type. |
| S09 | P0 | Same harvest drops inventory `addons` (Visible Faith/Unarmored Symbol), inline feat metadata/tags and inline spell addons. Resources preserve addons. Repair round-trip preservation before adding richer definitions. |
| S10 | P2 | “Visible Faith” is on Clerical Charms and Colors; robes have “Unarmored Symbol.” They are display-only hand-authored chips with no generic authoring path. The underlying religious visibility belongs in narrative/item description or an editable tag. “Unarmored Symbol” should not masquerade as an AC mechanic. |
| S11 | P2 | All95 spell cards expand by default because every entry has `access.label`, creating a ~14577px desktop panel. No sheet search/prepared-only filter; duplicate access/tag chips occupy empty definition rows. Provide compact groups, filters and detail views with actual rules. |

Seraphine's DC16 =8+proficiency4+WIS modifier4, spell attack+8, HP57 and slot maxima4/3/3/3/1 are internally consistent. Prepared38 is intentionally allowed by a source note; do not “fix” it by enforcing standard limits without a table decision. No portrait is configured; this is not a failed image URL.

## Shared missing/disconnected capabilities

| Capability | Current gap | Small repair-oriented outcome |
|---|---|---|
| Single resolved character state | Header, Stats, Gameplay, Resources and prose select different inputs | One derivation for active form, HP, AC, initiative, profiles and modifiers; previews use that derivation too. |
| Lossless generic authoring | No abilities/traits editor tab; feat editor only name/description; addons often dropped | Preserve unknown fields, author supported mechanics/provenance/conditions with the same schema used for rendering. |
| Effects from spells/features/equipment | AC modes are copied numbers; generic chips are presentation; item healing has a separate executable path | Add a small typed effect model extending existing canonical `features` and runtime adapters, not a parallel JSON dialect. |
| AC options | No consistent derivation from sourced spells, equipment and traits | Generate candidates from sourced effects. Distinguish base formulas, additive bonuses, caps, exclusive bases, prerequisites and durations. A spell merely being on a list does not make its effect active. |
| Access and resources | Prepared/Available/BossOnly/StoryPermission are mostly labels; slots/pools independent from individual spells | Resolve availability separately from preparation and active effects. Link free-use/slot/resource costs and reset rules. Retain table-permission overrides. |
| Casting profiles | One global ability/DC | Per class/feature/spell casting origin, with fixed or derived DC and explicit overrides. |
| Derived summaries | Literal AC/HP/roll formulas and stale traits coexist | Render explainable components from identifiers; keep flavor notes separate from computed values. |
| Completeness validation | Invalid records appear ordinary and safe to edit | Flag unresolved references, missing definitions, unsupported types/levels/units, stale numerical explanations and incomplete prerequisites before save/import. |
| Usable read-only card | Generic Spell/Flesh Attack labels, many badges, long catalogues, mode toggle buried | Appropriate labels, compact filtered lists, source/condition drill-down, prominent state control. Read-only card restrictions themselves are intentional. |

Mobile cards wrapped successfully and the tab rail scrolls horizontally; no large content overflow was observed. Approximately2px whole-page horizontal overflow exists. Hidden later tabs need a clearer scroll affordance. Feats lack the same View/provenance drill-down offered for spells/items/abilities. Desktop composition is legible but Capella's state cards and repeated HP explanations actively communicate conflicting truths.

## Current repair guidance

The [runtime guide](../Implementation/Runtime%20and%20Repair%20Guide.md) owns current repair order, completion criteria and later LLM assistance. Retain the observed defects and their evidence without restoring superseded character mechanics.

The original repair recommendations and discovery chronology remain recoverable from the baseline commit. No production fixes are claimed by this documentation consolidation.
