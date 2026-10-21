# Character Manager audit — October 12, 2026

This report preserves runtime observations from 2026-10-12; it is not a new audit. Current repair dependencies belong in the [Runtime and Repair Guide](../Implementation/Runtime%20and%20Repair%20Guide.md), and current rules belong in Systems. Findings are open until verified fixed; old branch descriptions are dated evidence, not instructions.

The project has a usable rendering foundation and an unfinished gameplay rebuild. The character problems are real: some are incomplete or contradictory source data, some are display bugs, and the most serious are save/conversion bugs that can damage otherwise good data.

This was an audit, not a repair pass. No character, library record, GitHub issue, PR, or branch was changed. All write reproductions used mocked GitHub methods. Files created for this investigation live under `Documentation/Troubleshooting/Evidence/`.

## Where work stopped

- **`main` is the older application:** `manager/`, `characters/`, and the previous library layout. Its latest commit is May 7, 2026. John Baluci is present there.
- **`staging` is the active rebuild:** `data/common`, separate Editor/Character Card/Session View/DM runtimes, `library/characters`, and canonical `library/records`.
- Local staging is `b4fe6fc`, May 10. GitHub staging is `f7056ce`, June 6. GitHub is **74 data-only commits ahead**; no runtime changes are missing from this checkout. I read those seven changed files through the GitHub connector and overlaid them for the audit.
- May 10 implementation work added shared item actions, HP/slot/resource helpers, a local player request tray, a DM response tray, and 10-second polling. Planning explicitly left complete widget parity, browser verification, character delta application, rolling, and richer resolution unfinished.
- June work changed Carol and two spell records. It left a partially converted character with missing references and malformed spell records.
- `main` and local staging diverge by 19 main-only / 193 staging-only commits. The rebuild has not simply replaced main. Existing exports can therefore point at different layouts and runtimes.
- GitHub has no issues returned by the repository issue search and no Actions runs. PRs [1](https://github.com/Lulukitty22/Character_Manager/pull/1) and [2](https://github.com/Lulukitty22/Character_Manager/pull/2) merged; [3](https://github.com/Lulukitty22/Character_Manager/pull/3), “Backfill manual library sources,” closed without merging. There is no open PR carrying this rebuild in the search results.

## Character inventory

| Character | Current situation | Confidence |
|---|---|---|
| Carol Elfnein | 31 unresolved references: 19 spells, 2 items, 5 abilities, 3 resources, 2 feats. The two resolved spells are also malformed. All 21 display as cantrips, including Fireball. Header class allocation disagrees with the calculator. This audited data is not the accepted current sheet. | Latest GitHub data, actual remote boot, browser, and runtime reproduction |
| Capella Emerada Lugnica | Custom boss/tamed data contradicts itself. Stored tamed HP 66 is recalculated as 104; active boss HP is 210. Header says 66/66, main stats 210/210, gameplay uses tamed HP, and explanatory text still says 66. Toggle leaves main HP unchanged. Stored level 1–9 spell slots resolve to none. Scores/formulas also disagree. | Runtime and browser reproduction |
| Rall | Level 11, proficiency +2, stored HP 0/0 versus calculated 0/92, Fighter/Battlemaster plus another Fighter/Eldritch Knight entry, WIS spellcasting, Fireball, no slots. The shared Fireball reference now resolves to a cantrip. Build looks incomplete; intended house rules need recovery. | Data and runtime reproduction |
| Seraphine | HP 57/57 and slots agree; all 95 inline spells have empty descriptions and casting times, with other spell detail fields largely blank. The broad spell list deliberately includes story/future permission, so its size alone is not a bug. Saving these entries exposes them to the conversion defect below. | Full data audit, renderer, editor form check |
| Aina Quickquiver | Best developed test fixture: HP 32/44, inventory/resource/action definitions resolve. Ranger 5 gets only three first-level slots and no second-level slots. It has no spells. Ammo/item actions exist, but DM approval does not apply them to canonical state. | Data and calculation reproduction; live approval not exercised |
| Test Character 1 | Intentional test data, but exposes migration flaws: stored 730/1337 becomes 730/6 in calculated views. Not a valid ordinary play sheet. | Runtime reproduction |
| John Baluci | Present on main at `characters/john-baluci.json`; absent from staging’s six-character directory. New editor cannot list him there. His main file is mostly identity/story content, without a D&D build. He is preserved, not deleted from the repository. | GitHub read and branch inventory |

## Highest-priority defects

### 1. Saving inline content produces malformed canonical records

**Severity: critical; reproduced with mocked writes.**

`recordFromCharacterEntry()` creates a canonical record with `schemaVersion: 1`, `features: {}`, and `desc: ""`, then puts old fields such as `level`, `description`, and `addons` alongside those fields. The canonical normalizer sees schema version 1 and ignores the old fields. A level-3 spell with school, range, damage and description resolves as a blank level-0 spell after saving.

Evidence: `data/common/scripts/library.js:726`, `data/common/scripts/importers/library-records.js:49`, `Documentation/Troubleshooting/Evidence/results.json` → `saveSimulation`.

This is already visible in June’s Fire Bolt/Fireball records. Fireball’s old valid evocation file remains on disk, but the manifest points to a new root-level file with the same ID and empty canonical features. This affects other characters using that shared Fireball reference, including Rall. The remote manifest has 99 entries and no duplicate IDs; the duplicate is an unlisted old file, not two simultaneously loaded manifest entries.

### 2. Saving a character erases shared class/species definitions

**Severity: critical; reproduced with mocked writes.**

`syncNameRecord()` constructs a blank record for the character’s class/species. `upsertLocal()` merges it over the existing definition, replacing features, description, and tags with empty defaults. In the reproduction, Wizard loses its d6 hit die and full-caster metadata. Standard-name fallback tables mask some resulting damage; custom records have less protection.

Evidence: `data/common/scripts/library.js:765` and `:692`; `Documentation/Troubleshooting/Evidence/results.json` → `classBefore` / `classAfter`.

### 3. Interrupted conversion leaves references to records never saved

**Severity: critical; reproduced with mocked failure.**

`syncCharacter()` converts every entry into references before it finishes writing records. A failure during a later write leaves the supplied character mutated. Retrying the same object treats those references as already migrated and writes no missing records. Reproduction: first spell saved, second failed, retry wrote zero records and left missing spell/item references.

Evidence: `data/common/scripts/library.js:628`; `Documentation/Troubleshooting/Evidence/failure-repro.json`.

This mechanism is consistent with Carol’s partial migration, but the exact historical failure is not established. Her missing inline details can be recovered from the pre-June file/history.

### 4. Character editor round trips drop fields

**Severity: high.**

`EditorSpells.readTab()` rebuilds inline spells from selected form fields without retaining `addons`, losing extra mechanics such as damage, ritual/concentration metadata, and custom additions. Character-local `access` survives this form pass, but `spellState()` omits it during inline conversion. `itemState()` turns quantity 0 into 1 via `Number(...) || 1` and drops `attuned`. The latter two effects were reproduced in the migration test.

Evidence: `data/editor/scripts/editor-spells.js:715`; `data/common/scripts/library.js:792` and `:796`.

### 5. Conflict retries overwrite newer state

**Severity: high; source-confirmed, not tested against live competing clients.**

Character and record saves respond to a SHA conflict by reading the new SHA and writing the same stale object. They do not merge the latest character/queued actions. This can lose another client’s changes while making the retry succeed.

DM drafts also retain captured `entry.record` snapshots. Each approval clones that snapshot; multiple staged responses for one record can reintroduce a previously resolved request or remove a prior log entry. This needs a dedicated concurrency/batch regression before shipping.

Evidence: `data/editor/scripts/app.js:260`; `data/common/scripts/library.js:341`; `data/dungeon_master/scripts/app.js:386`.

## Calculation and display defects

1. **Legacy manual HP is silently recalculated.** Missing `hp.mode` selects calculated HP whenever possible. Capella’s tamed pool becomes 104 instead of its stored/documented 66. Test Character becomes 730/6; current HP is not bounded to effective max. A Fighter 5 with stored 100/100 and CON 14 resolves as 44/44. See `dnd-calculations.js:268`.
2. **Custom spell slots disappear.** Missing slot mode defaults to calculated. Capella’s unknown custom progression produces no slots and discards stored maxima. See `dnd-calculations.js:230`.
3. **Manual slot override cannot reduce calculated/stored maxima.** It takes `Math.max(override, calculated, stored)`. Setting level-1 maximum to 1 on Wizard 5 still gives 4. See the `slotOverride` reproduction in `results.json`.
4. **Single-class half-caster progression is wrong.** Aina Ranger 5 gets 3 level-1 slots, versus standard 2014 rules of 4 level-1 and 2 level-2. Ranger 3 gets 2 rather than 3 level-1. The generic multiclass calculation is being used as the single-class table. Subclass progression is ignored, and pact magic is manual-only. [Official Ranger table](https://www.dndbeyond.com/classes/5-ranger). See `dnd-calculations.js:119` / `:593`.
5. **Rall’s standard proficiency would be +4 at level 11.** Stored +2 affects saves and skills. Same-class subclass splitting and WIS spellcasting also need intent review, not blind correction. [Official Fighter table](https://www.dndbeyond.com/classes/10-fighter).
6. **Sticky quickstats bypass shared calculations/state.** Header uses raw HP, stored initiative and its own AC selection. See `view-character-header.js:50`. Capella demonstrates conflicts within a single visible sheet.
7. **Boss toggle targets obsolete HP selectors.** It searches `.sheet-hp-current`, `.sheet-hp-max`, `.hp-bar-fill`; current renderer uses `.ovh-*` equivalents. Browser toggling to tamed changes AC/abilities but leaves 210/210 HP. See `view-character-boss.js:64`.
8. **Gameplay HP always uses tamed state.** The shared action hub calls `resolveTamedHp()` even with boss active. See `view-character-gameplay.js:13`.
9. **Multiclass labels inflate primary-class level.** Total level is printed beside primary class, then additional class levels are appended. The Carol reproduction demonstrates the mismatch. See `view-character-header.js:41` and identity renderer.
10. **Missing spells are rendered as usable-looking cantrips.** Missing refs keep prepared state; unknown level becomes 0. Warnings exist, but the surrounding representation is wrong. Carol’s actual remote card confirms this.

Capella’s base scores (6/5/8/1/9/10) plus boss bonuses produce scores (12/10/16/2/18/20), including INT 2. Narrative math and social-check annotations imply different values. This needs source reconstruction; the audit does not choose replacement stats or assume homebrew must match standard classes.

## Gameplay and sync gaps

- **DM approval is bookkeeping only.** It moves requests to a log and records a reply. It does not apply HP, slot, ammo, inventory or other deltas to characters. Planned resolution/rolling/rest/crafting work remains unfinished.
- **No actual spell-casting pipeline.** “Spell Actions” is a list of slot-spend requests, not individual spells with prepared/access/target/component/concentration handling. Spell/story permission chips are descriptive metadata.
- **Drafts are memory-only.** Player requests and DM response trays survive rerenders, but disappear on reload/navigation. Composer/tab preservation is also not durable storage.
- **Read-only Session View does not refresh remote state.** Polling exits without writable auth, and manual refresh routes through a method that fetches only when writable. The visible refresh control can therefore reuse cached state.
- **Polling errors can look like success.** Quiet refresh catches errors internally; callers then report that records were polled. Full library reload every 10 seconds also scales with the entire 99-record library rather than the active session records.
- **Partial submit can duplicate requests.** Player batches clear drafts only after all destination groups succeed. If one group succeeds and a later group fails, retry recreates requests with new IDs for the already-sent group.
- **DM batch failure handling is weak.** Inner resolution catches errors without rethrowing, so the outer batch catch/break cannot reliably stop on failure.
- **DM actor labels are unresolved.** Queue/history hydration passes an empty participant context, so Aina appears as a UUID instead of her name. Confirmed in the actual remote DM view.
- **Export branch is hardcoded to staging.** The editor can read/write its configured branch while the export reads staging. Also, exports reference a path and boot code; renaming/moving a character can invalidate an old file, and no embedded offline snapshot exists. See `data/editor/scripts/export.js:15`.
- **Library loading can conceal broken content.** Viewer library load treats a failed fetch as a reason to continue without seeded records. The sheet can still render missing-reference placeholders rather than make failure unmistakable.
- **Validation misses the problem domain.** Existing validator skips all character JSON and only checks library structure/index shape. It does not validate character refs, record mechanics, or persistence round trips. No Actions runs/test runner were found.

## What is working

- All six staging characters resolve/generate HTML without runtime exceptions in the audit harness.
- Shared tabbed renderer, capability presets, record viewers, library reference resolution, and basic inventory/action infrastructure exist.
- Existing canonical library records mostly resolve. Carol’s missing refs are concrete data failures rather than universal resolver failure.
- HP calculations and ordinary full-caster slots agree for Seraphine and current Carol.
- Actual Carol remote Character Card boot loads the current GitHub runtime and data successfully. This validates boot connectivity, not sheet correctness.
- The permanent remote Editor boot reaches its Settings screen. Actual remote Session View and Dungeon Master also boot without auth, load the seeded session/queue/history, and disable submission/approval controls. Their authenticated write paths were not exercised.
- Seraphine editor modules mount and harvest the form; basic data can be displayed. The audit-only editor page omits manager chrome and its App auto-init error is a harness limitation, not classified as a production defect.
- Local library validator passes 98 records/98 entries, and all JavaScript under `data` and `tools` syntax-parses. These are limited structural checks.
- UTF-8 BOMs are present, but the production GitHub decoder strips them and raw fetch decoding handles them. They are not a demonstrated load failure.

## Verification limits and saved evidence

I inspected every staging character, latest changed GitHub data, runtime manifests, renderers, calculations, save/conversion paths, gameplay sync paths, planning status, and branch/PR history. Browser sheet checks focused on Capella, Carol and Seraphine; all four remote surface boots were checked without auth. Actual live GitHub writes, PAT permissions, two-client races, and full mobile/browser parity were not exercised. Existing distributed HTML exports are outside this checkout, so their exact contents cannot be audited here.

- Corrected discovery chronology is recoverable from baseline Git history; the substantive audit findings and caveats are retained here.
- `remote-snapshots.json`: seven files changed after the local staging commit.
- `results.json`: all six character reports and calculation/save reproductions.
- `failure-repro.json`: interrupted migration and quantity/state reproduction.
- `run-audit.cjs` / `failure-repro.cjs`: repeatable, mocked audit scripts.
- `john-main.json`: main-only character snapshot.
- Generated viewer/editor HTML is disposable output of `run-audit.cjs`; inputs, results and browser captures remain in Evidence. The baseline Git checkpoint preserves the original generated pages.
