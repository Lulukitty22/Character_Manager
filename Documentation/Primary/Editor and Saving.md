# Editor and Saving

`Editor.mount` builds forms and harvests a cloned character through each module's `readTab`. Saving then converts entries to shared records and writes GitHub JSON. Data can disappear during harvesting before any network request; verify a no-change round trip before testing persistence.

- Mount/harvest: `data/editor/scripts/editor-mount.js` (`getCurrentCharacter`).
- Forms: `editor-spells.js`, `editor-inventory.js`, `editor-dnd.js`, `editor-boss.js`, `editor-resources.js` in that folder.
- Save orchestration: `data/editor/scripts/app.js`; shared conversion: `data/common/scripts/library.js`.
- GitHub persistence/auth: locate helpers in `data/common/scripts` and editor boot.
- 2026-10-12: inline spell/item/feat metadata is lost; unsupported `clothing` becomes `weapon`; quantity0 becomes1. There is no general abilities/traits editor tab.
- Failed partial conversion can leave unwritten references that retries skip. Conflict retries must not overwrite newer payloads using only a refreshed SHA.
- Evidence: `Documentation/Troubleshooting/Evidence/seraphine-editor-roundtrip.json`, `failure-repro.json`, `results.json`.
- 2026-10-17 container preflight: `schema.js:createDefaultInventoryItem` has flat fields only. `editor-inventory.js:syncPanelToCharacter` reconstructs item objects from visible fields; `editor-spells.js:readTab` does likewise for spells. Unmodeled book contents, parentage or donor-cast snapshots would be discarded if simply added to character JSON. Preserve those fields through harvest/conversion before shipping container/ammunition state; this is a concrete dependency of Carol's rebuild, not a reason to rewrite every editor now.
- `tools/validate-library-schema.js` skips `library/characters/`; a successful library validation is not evidence Carol's character formulas or editor round trip are correct. Verify her actual runtime/save behavior separately.

- Selected2026-10-18 future-backend behavior: offline means ephemeral unsent page buffer only, no durable autosave/replay guarantee. Server state wins; reconnect fetches latest and revalidates before user submission. Never overwrite server changes with a stale full character. Absence-related fixes/retcons are explicit DM-approved requests, not automatic reconciliation. No implementation yet.
