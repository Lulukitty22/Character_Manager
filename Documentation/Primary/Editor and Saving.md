# Editor and Saving

`Editor.mount` builds forms and harvests a cloned character through each module's `readTab`. Saving then converts entries to shared records and writes GitHub JSON. Data can disappear during harvesting before any network request; verify a no-change round trip before testing persistence.

- Mount/harvest: `data/editor/scripts/editor-mount.js` (`getCurrentCharacter`).
- Forms: `editor-spells.js`, `editor-inventory.js`, `editor-dnd.js`, `editor-boss.js`, `editor-resources.js` in that folder.
- Save orchestration: `data/editor/scripts/app.js`; shared conversion: `data/common/scripts/library.js`.
- GitHub persistence/auth: locate helpers in `data/common/scripts` and editor boot.
- 2026-10-12: inline spell/item/feat metadata is lost; unsupported `clothing` becomes `weapon`; quantity0 becomes1. There is no general abilities/traits editor tab.
- Failed partial conversion can leave unwritten references that retries skip. Conflict retries must not overwrite newer payloads using only a refreshed SHA.
- Evidence: `Documentation/Troubleshooting/Evidence/seraphine-editor-roundtrip.json`, `failure-repro.json`, `results.json`.
