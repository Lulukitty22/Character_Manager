# Second audit: Carol, Capella, Seraphine

Documentation reorganized after this audit: current entrypoint is `Documentation/Start Here.md`; old plans are archived. Evidence files are in `Evidence/`, running logs in `Notes/`. Branch statements below describe the audited snapshot.

2026-10-12. Scope: character repairs, composition, rendered webpages, missing and disconnected features. No DM/party expansion. No production character data or runtime changed.

These sheets render successfully, but rendering success does not establish correctness. Carol has broken library migration; Capella has several incompatible numerical definitions; Seraphine has an incomplete spell catalogue and build. All three are affected by editor/schema gaps and display-only mechanics.

## Evidence and coverage

Used the latest GitHub staging snapshot retrieved during the first audit (f7056ce, June 6) over the older local data. Runtime files are unchanged between those snapshots. Carol's older local inline character retains recovery material that the latest references no longer resolve. See `remote-snapshots.json`, `composition-resolved.json`, and the first `AUDIT_REPORT.md` for repository history/save-pipeline evidence.

Inspected all eight visible tabs for each character: Identity, D&D Stats, D&D Gameplay, Abilities & Feats, Spells, Resources, Notes, plus Inventory for Carol/Seraphine and Combat for Capella. Saved 24 browser accessibility observations alongside this report. Tested Capella's boss-to-tamed preview, Carol's AC selection, Seraphine's spell detail modal, and a no-save editor harvest. Inspected desktop and 390px-wide layouts. Generated local pages use the actual viewer/editor modules and latest seeded library data, not a replacement implementation.

Screenshots: `carol-mobile.png` demonstrates header AC22 versus Combat Stats AC16; `carol-mobile-spells.png` shows missing records grouped as cantrips; `seraphine-empty-spell-modal.png` shows the empty definition; `seraphine-mobile-inventory.png` shows bespoke inventory descriptors. `seraphine-editor-roundtrip.json` records the destructive form harvest. The editor harness lacks manager chrome; its unrelated app-init error is a harness limitation, not a production finding.

Severity: P0 = data preservation/recovery prerequisite; P1 = incorrect or unusable gameplay information; P2 = incomplete authoring/usability/support. Numbers below describe what the application currently does, not a ruling on intended homebrew balance.

## Carol

| ID | Priority | Finding and repair direction |
|---|---|---|
| C01 | P0 | Latest character has 31 unresolved references: 19 spells, 2 items, 5 traits, 3 resources, 2 feats. Names/rules disappear behind “Missing record” placeholders. Recover from original inline content and history, create valid canonical records, and repair manifest references before editing this build. |
| C02 | P1 | The two resolved spells, Fire Bolt and Fireball, have empty definitions. Fireball resolves as level0. All21 spells appear under Cantrips, including missing entries whose unknown levels are silently defaulted to0. Missing/invalid records must render as unresolved, never as usable cantrips. |
| C03 | P1 | Header and identity say Wizard10 plus Sorcerer1; calculator uses Wizard9 plus Sorcerer1, total10. The stored `dnd.level` means total level but display treats it as primary-class level. Show class allocation explicitly. |
| C04 | P1 | Clicking Bladesong22 updates only header AC; Combat Stats remains16. Tooltip still identifies Base/Mage Armor. Selection is temporary CSS/text, not a shared resolved state. |
| C05 | P1 | Shield + Bladesong is25 while its own formula notes27; future Otherworldly Guise29 is freely selectable. Base Mage Armor16 assumes a spell is active without tracked duration/casting/conditions. Preserve these as provisional assumptions until approved formulas and access are specified. |
| C06 | P1 | Faust robe transformation, interruption, memory-burn and singing calculators are stored under `dnd.addons.calculations.rolls`, but the renderer only calls the calculator for bosses and reads `boss.addons`. Four configured calculators are unreachable. Generalize the supported calculator format. |
| C07 | P1 | Memory burn says `1d4 x (1d8-0)`, whereas source notes/logs use subtract2 per die. The data itself calls this provisional because CHA11 gives+0. Need a table ruling; do not silently choose one. Bind approved cost rules to Spell Memories rather than leaving prose and counters independent. |
| C08 | P1 | Sorcerer casting shares the wizard's displayed INT DC18/attack+10. There is only one character-wide casting profile. Current CHA11 would give base sorcerer DC12/attack+4 using stored proficiency4; spell-specific origins, feature bonuses and homebrew must determine which profile applies. |
| C09 | P2 | Bladesong, Metamagic Adept/sorcery points, Faust robe, singing and memory pools are separate descriptions/counters/AC rows. No declared relationships activate effects, spend appropriate pools, distinguish casts or remove effects. Recovery should include these relationships, not just restoring names. |
| C10 | P2 | INT22, future access, Mage of Quandrix and homebrew robe assumptions need explicit provenance/rules-version/table-permission fields. High stats/homebrew are not inherently bugs. Current migration lost spell access distinctions; future content must not look currently castable. |

Carol's stored HP28/62 agrees with calculated62. Historical Spell Memories70 minus logged expenditures20 agrees with current50. Preserve those histories during recovery.

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
| AC options | No derivation from Shield, Mage Armor, Bladesong, Armored Flesh | Generate candidates from sourced effects. Distinguish base formulas, additive bonuses, caps, exclusive bases, prerequisites and durations. A spell merely being on a list does not make its effect active. |
| Access and resources | Prepared/Available/BossOnly/StoryPermission are mostly labels; slots/pools independent from individual spells | Resolve availability separately from preparation and active effects. Link free-use/slot/resource costs and reset rules. Retain table-permission overrides. |
| Casting profiles | One global ability/DC | Per class/feature/spell casting origin, with fixed or derived DC and explicit overrides. |
| Derived summaries | Literal AC/HP/roll formulas and stale traits coexist | Render explainable components from identifiers; keep flavor notes separate from computed values. |
| Completeness validation | Invalid records appear ordinary and safe to edit | Flag unresolved references, missing definitions, unsupported types/levels/units, stale numerical explanations and incomplete prerequisites before save/import. |
| Usable read-only card | Generic Spell/Flesh Attack labels, many badges, long catalogues, mode toggle buried | Appropriate labels, compact filtered lists, source/condition drill-down, prominent state control. Read-only card restrictions themselves are intentional. |

Mobile cards wrapped successfully and the tab rail scrolls horizontally; no large content overflow was observed. Approximately2px whole-page horizontal overflow exists. Hidden later tabs need a clearer scroll affordance. Feats lack the same View/provenance drill-down offered for spells/items/abilities. Desktop composition is legible but Capella's state cards and repeated HP explanations actively communicate conflicting truths.

## LLM assistance proposed by the user

There is no demonstrated Jev/Julia-1 integration or model interface in this audit. Treat these as proposed reviewers/assistants, not existing functioning features. No claim about their pricing, availability or calibrated reliability is made.

1. **Factual sheet Q&A:** expose a deterministic query such as `getSpellcastingProfile(characterId, origin, state)`. Answer “Seraphine's spell DC is16:8+4+4,” with source fields and snapshot revision. An LLM can select the tool and explain its answer. Ambiguous casting origin or stale data should be surfaced, not guessed. Numeric answers should not be generated from prose.
2. **Definition/import reviewer:** give a model the source text, rules version, target schema and allowed effect types. Require schema-valid candidates with quoted supporting spans, source IDs, conditions, target, magnitude/formula, duration, stacking and “unknown” fields. Deterministic validators check types, ranges, references and mathematical consistency. Preserve the original text and reviewed candidate. Neither a successful format check nor repeated model agreement proves rule correctness.
3. **Effect extraction:** Shield should propose an additive AC5 effect with reaction trigger and expiration, not simply find “5” and add it permanently. Mage Armor should propose an alternate base formula. Disambiguate spell-level DC, fixed creature DC, bonuses to saves, and DCs for dispelling. Apply only accepted candidates; uncertain homebrew should remain pending.
4. **Contextual recommendations:** retrieve verified spell definitions plus current prepared/access/slots, concentration, targets/position, duration, enemy saves/resistances and Seraphine's RP preferences. Compare candidates and explain assumptions. Presently her95 blank definitions cannot support a trustworthy “best AoE against a horde” answer from this repository.
5. **Confidence:** distinguish verified engine calculation, missing source, extraction uncertainty and recommendation assumptions. An LLM's self-reported percentage is not calibrated accuracy. Store evidence and validation status first; measure performance on known cases before publishing confidence percentages. Multiple runs can reveal disagreement but agreement alone is insufficient.

This can be a narrow repair-support layer. It should follow data recovery and schema repair, rather than expanding into a new party or DM system.

## Repair sequence and completion criteria

1. **Preserve data (P0):** lossless editor harvest; canonical conversion repairs from first audit; keep item types, addons/access/tags/attunement; reject unresolved destructive saves. Round-trip each actual character and compare meaningful fields, not just successful parsing.
2. **Recover Carol:** restore31 records and correct malformed spells using original content/history; retain HP/resource logs; separate current versus future access. No unresolved placeholders or false cantrip classification remain.
3. **Reconcile Capella:** settle intended base scores, pool/form model and casting configuration; eliminate conflicting literal calculators; make preview/header/all tabs agree. Prove advantage scope and polymorph effects with both states and inactive traits.
4. **Complete Seraphine:** select rules version/domain and source forAC; populate spell definitions; separate narrative descriptors; wire Shield/Intuition/Guardian resources and conditional effects. Do not invent Fading Grace mechanics.
5. **Connect the shared effect/AC/casting model:** authorable typed rules with provenance and activation; consistent summaries across surfaces; maintain explicit homebrew exceptions.
6. **Improve presentation and add assistant support:** compact searchable spell lists, mode control, incomplete-data feedback; then tool-backed Q&A/import review.

Required table decisions are limited to intended homebrew/build facts: Capella's actual base scores/tamed body and blanket advantage, Carol's provisional AC/memory-cost/permission rules, and Seraphine's domain/AC/Fading Grace. Technical preservation, display synchronization and missing-definition recovery do not require inventing those rulings.

Running findings remain in `Notes/CHARACTER_COMPOSITION_ISSUES.txt`. This report distinguishes verified defects, intentional homebrew, incomplete specifications and recommended feature connections; production repairs have not been applied.
