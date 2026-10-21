# Runtime and Repair Guide

This guide owns the existing application map, known implementation defects and repair dependencies. Carol's tabletop baseline is accepted, but her production JSON remains old; campaign, container and action systems are design requirements, with no backend setup or migration completed. The first implementation milestone and acceptance criteria still need agreement.

## Scope and repair order

Continue [campaign architecture](../Systems/Campaigns%20and%20Shared%20Data.md), retaining the selected [container and scroll rules](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md) and [action/effect workflow](../Systems/Spell%20Effects%20and%20Active%20State.md). DM/party-aware casting is included in that design; further archived Session/DM expansion and other character repairs remain deferred.

Implementation dependencies are lossless persistence and ownership; definitions, snapshots and calculations; actions, resources and game time; then integrated viewer/editor verification. Identify narrow schema, harvesting and conversion changes before migrating characters. Build and verify Carol's Manager sheet when these dependencies are ready, then resume Capella and Seraphine in that order without automatically applying Carol's mechanics. LLM assistance follows reliable structured data.

The [Carol sheet](../Character%20Sheets/Carol%20Elfnein.md) owns her accepted statistics, equipment and spells; focused Class Reference documents own build provenance and weapon mechanics. Historical audit findings remain open until verified fixed. Minor bookkeeping and parked economy proposals do not reopen accepted build decisions or block architecture discussion.

## Repository and serving targets

`Lulukitty22/Character_Manager` stores characters in `library/characters`, reusable definitions in `library/records`, runtime in `data`, and HTML entrypoints in `share`. The existing editor, shims and exporter target `staging`; the historical audit found GitHub's default `main` branch had an older layout. Switching a local branch does not change which branch exported sheets fetch.

Historical recovery references from 2026-10-12: `Legacy` was pinned to GitHub staging `f7056ce080560023e5c0575f656e2d2f85b6fcad` (2026-06-06), with `codex/character-repairs` based on that fallback. Old local staging `b4fe6fc` is an ancestor containing useful Carol inline recovery data. Recover selectively through Git history rather than overwriting current data. Preserve unfinished Session/DM code; removing superseded documentation does not remove it. Inspect current `git status`, branches and remote refs before changes, because stale tracking refs caused the original audit mismatch. These historical branch descriptions do not establish the current checkout.

### HTML loader and export

HTML files are thin shims: GitHub owner/repository/branch metadata selects boot code, which loads a manifest, styles/scripts, character JSON and the shared library before mounting the sheet. Local renderer edits do not affect a remote shim unless its configured serving branch contains them.

| Concern | Existing location |
|---|---|
| Viewer boot and manifest | `data/viewer/boot.js`, `data/viewer/manifest.json` |
| Editor entry and boot | `share/Character_Manager_Editor.html`, `data/editor/boot.js` and its manifest |
| Export construction and branch | `data/editor/scripts/export.js`, `EXPORT_BRANCH` |
| Parked Session/DM runtime | `data/session_viewer`, `data/dungeon_master`, `share/Dungeon_Master.html` |
| GitHub JSON writes | `data/common/scripts/github.js`; file SHA replacement and commits, not live campaign transactions |

Viewer metadata includes `character-path`, `schema-version`, `github-owner`, `github-repo` and `github-branch`. Investigate a blank/error sheet in this order: metadata, boot fetch, manifest paths/order, character/library references, mount. Viewer boot uses `cache: "no-store"`; no universal five-minute GitHub delay was established.

The current export is not a self-contained offline sheet. The selected future [live character-only export shell](../Systems/Campaigns%20and%20Shared%20Data.md#live-character-sheet-exports) is documented in Campaigns and Shared Data; its downloaded `file://` loading and hosted authentication behavior still require implementation verification. Hosting, permissions and ephemeral offline-input policy belong to that same document.

## Character data and library

Character JSON combines identity, build and owned state with inline entries or references to reusable records. Canonical library records use `schemaVersion`, `features` and `desc`; runtime adapters produce the older display shape. Successful JSON parsing does not establish lossless normalization or manifest reference resolution.

| Concern | Existing location |
|---|---|
| Defaults, imports and schema | `data/common/scripts/schema.js` |
| Reference resolution and conversion | `data/common/scripts/library.js`: `resolveCharacterSync`, `syncCharacter`, `recordFromCharacterEntry`, `syncNameRecord` |
| Canonical adapter | `data/common/scripts/importers/library-records.js` |
| Library index and definitions | `library/manifest.json`, `library/records` |

The 2026-10-12 audit found inline-to-canonical conversion could erase spell rules and class/species synchronization could overwrite richer definitions. Carol had 31 missing definitions; Fireball resolved as level 0 with empty rules. Older inline/history data is recovery material. These observations have not been freshly reverified by documentation cleanup.

### Class records and feature integration

Existing `library/records/classes/wizard.json` and `sorcerer.json` contain basic metadata/progression, not a complete 2024 feature catalogue. The recorded inspection found no Artificer record in `library/records/classes/` and no dedicated subclass collection in `library/manifest.json`; subclass representation and loading need deliberate design. Calculator fallback recognition is not a usable Artificer library.

The hit-die reader in `data/common/scripts/dnd-calculations.js` expects root `hitDie` or `addons.hp.hitDie`, while current records store `features.class.hitDie`. Known-class fallbacks can conceal that mismatch. Recheck loader/schema paths before implementation rather than relying on a silent fallback. the removed comparison generator (recoverable from the baseline commit) generates documentation tables using the calculator with a minimal Schema stub and no Library context; it does not validate loaded records or UI behavior. Stable production issue IDs remain in `Documentation/Troubleshooting/Carol Repair Findings.md`.

Reusable features need class/subclass identity, publication/version, minimum class level, prerequisite, calculation/effect, action/trigger, resource/cap/reset and source pointer, explicitly distinguishing published, playtest, approved homebrew and unresolved material. Spells need class tags and grant source, edition, tier, action, attack/save, damage/healing, duration/concentration, components/costs, scaling and verified structured effects. Preserve full readable definitions alongside normalized values. Base AC, conditional bonuses and Reaction bonuses need distinct representations; prose such as “+5 AC” must not become a permanent modifier.

Keep class level, character total, effective caster level and casting origin separate. Shared slots have one authoritative pool, with preparation and known/eligible catalogues separate; stored items retain independent capacity and consumed state. Encode small source-backed records for the accepted build after resolving genuinely missing published limits, without restarting settled choices.

Core/campaign definitions, live links, independent customization, owned instances, immutable paid snapshots and copy/import authority have one policy home: [Campaigns and Shared Data](../Systems/Campaigns%20and%20Shared%20Data.md). Match by stable identity and origin rather than names.

## Editor harvesting and persistence

`Editor.mount` builds forms and harvests a cloned character through each module's `readTab`. Saving converts entries to shared records and writes GitHub JSON. Data can disappear before any network request: verify a no-change round trip before testing remote persistence.

| Concern | Existing location |
|---|---|
| Mount and harvest | `data/editor/scripts/editor-mount.js`, `getCurrentCharacter` |
| Forms | `editor-spells.js`, `editor-inventory.js`, `editor-dnd.js`, `editor-boss.js`, `editor-resources.js` in `data/editor/scripts` |
| Save orchestration | `data/editor/scripts/app.js` |
| Shared conversion | `data/common/scripts/library.js` |
| GitHub persistence/auth | Helpers in `data/common/scripts` and editor boot |

The 2026-10-12 audit found loss of inline spell/item/feat metadata, unsupported `clothing` converted to `weapon`, and quantity 0 converted to 1. There is no general abilities/traits editor tab. Failed partial conversion can leave unwritten references that retries skip. Conflict retries must not overwrite newer payloads using only a refreshed SHA.

The 2026-10-17 container preflight found `schema.js:createDefaultInventoryItem` had flat fields only. `editor-inventory.js:syncPanelToCharacter` reconstructs items from visible fields, and `editor-spells.js:readTab` does likewise for spells. Simply adding book contents, parentage or donor-cast snapshots to JSON would lose them during harvesting. Preserve unknown and nested fields through harvesting, normalization, conversion, save/reload and import/export before shipping container/ammunition state. This is a narrow migration dependency, not an instruction to rewrite every editor.

Reproduction evidence remains in `Documentation/Troubleshooting/Evidence/seraphine-editor-roundtrip.json`, `failure-repro.json` and `results.json`. The evidence files, rather than prose claims of successful parsing, establish the recorded failures.

## Rendering and calculations

`ViewCharacter` resolves a character and builds section tabs. Calculations, header quickstats and boss preview currently use different inputs, allowing disagreements. One resolved active state must drive each numeric display, with visible sources and formulas.

| Concern | Existing location |
|---|---|
| Coordinator and tabs | `data/common/scripts/views/view-character.js`: `buildTabs`, `buildHTML`, `wireInteractive` |
| Stats, AC and roll summaries | `data/common/scripts/views/view-character-dnd.js` |
| Boss preview, attacks and defences | `data/common/scripts/views/view-character-boss.js` |
| Header | `data/common/scripts/views/view-character-header.js` |
| HP and slots | `data/common/scripts/dnd-calculations.js` |
| Record modal and chips | `data/common/scripts/views/view-character-utils.js` |
| Sheet styling | `data/common/style/sheet.css` |

The 2026-10-12 audit found the boss HP toggle targeted obsolete selectors, AC selection changed only header text, Carol's nonboss custom calculators did not render, merely owned effects were treated as active, and modes/resources were disconnected. Gameplay/resources also have separate renderers. No new browser audit is claimed.

Explain class/subclass levels, proficiency bonus, ability contributions, HP, saves, skills, Expertise and tools. Keep native proficiency distinct from conditional item grants; never add proficiency bonus twice. Skill/tool synergy needs its applicable rule and DM adjudication, and Manifold grants no global Advantage. Distinguish owned, carried, held, equipped, attuned and active items; planned versus active replicas; permanent acquisitions versus temporary creations, elixirs, potions and ammunition. Retain source-specific recharge/expiry and acquisition provenance without automatically debiting present gold or slots.

Effects, resources, concentration and the shared game clock must refresh every dependent view consistently. Private presentation does not disable mechanics. Detailed timing, roll modes, manual adjudication and visibility remain in the canonical Systems documents.

### Ability scores

Campaign policy confirmed 2026-10-16 permits scores above ordinary published limits. Show a nonblocking informational marker above 20; never clamp or block an upper score. Continue `floor((score - 10) / 2)`. Explicit DM grants are valid sources, while published-source verification and avoiding duplicate application still matter. Carol's specific Indomitable grant belongs in her build provenance, not a generic bonus applied to every character.

`schema.js:getAbilityModifier` already scales without an upper clamp. `data/editor/scripts/editor-dnd.js:renderStatInputGroup` had its maximum of 30 removed and a live above-20 marker added; minimum/integer validation remains. `view-character-dnd.js:renderAbilityScores` marks base scores above 20. Syntax checks passed for both changed scripts; browser validation is unverified. No production character/trait JSON was changed, and trait integration awaits a clean rebuild. Class-level and spell-slot maxima are separate concepts and were not removed.

Standard point buy stops at 15. Optional extended costs are campaign estimates, not official rules or mandatory budgets: marginal cost is 2 for 14/15, 3 for 16/17, 4 for 18/19, 5 for 20/21, 6 for 22/23, continuing the pattern. From 8=0 the totals are 15→9, 16→12, 17→15, 18→19, 19→23, 20→28, 21→33 and 22→39. Label extrapolation, allow overrides and keep starting purchases separate from later gifts/level increases. No point-buy calculator was found in the editor search; this is a proposal, not implemented UI.

The researched revised Tome of Clear Thought grants an actual +2 INT after study, up to 30; it does not merely unlock an empty ceiling. That published behavior does not establish Carol's ownership or replace her earned grant.

## Verification limits and acceptance

The library validator `tools/validate-library-schema.js` skips `library/characters/`. Passing it establishes neither character correctness nor editor round-trip behavior. A read-only fixture using fallback data passed Carol's HP 95, effective caster level 14 and slot calculations; it did not load the live library or establish browser correctness. Production Carol JSON is still older data.

Before migration, verify unknown/nested field preservation and a no-change editor round trip, then actual save/reload/import/export and resolved viewer/editor behavior on desktop and narrow layouts. Check formulas, casting, holds/spending, effects and resources against the agreed milestone. Feature gating, readable spell definitions, loaded/empty weapon states and conditional effect scope must be clear; level changes must recalculate slots and eligibility, while spending/resting and save/reload preserve correct state. Historical reproductions remain evidence until the specific defect is verified fixed; documentation cleanup does not constitute a repair.

Carol's build-source reference retains the confidence distinction between official material and the final-book-labelled secondary Artificer transcription used where the full published chapter remained gated. Do not silently upgrade that provenance claim.

## Later LLM assistance

Proposed assistance covers sheet Q&A, spell/import review and contextual recommendations. Numeric answers must use deterministic calculations and cite source fields/revision; for example the audited Seraphine DC 16 is 8 + proficiency bonus 4 + WIS 4. Models may propose structured effects from verified text, but validation and human acceptance must precede gameplay changes.

Extraction needs source spans, rules version, target, formula/magnitude, conditions, duration and stacking, allowing unknown values. Distinguish an AC bonus such as Shield from a base formula such as Mage Armor; ownership alone activates neither. Recommendation context includes preparation, access, slots, concentration, enemies, position and roleplay constraints.

Jev/Julia-1 were user proposals with no verified integration. Self-reported confidence and repeated agreement are not measured accuracy. Reliable data/schema repairs precede model integration; the historical character-composition audit holds the original proposal.
