# HTML Loader

HTML files are thin shims that read GitHub owner/repository/branch metadata and fetch remote boot code. The boot loads a manifest, styles/scripts, character JSON and the shared library, then mounts the sheet. Editing local renderer files will not affect a remotely loaded shim unless its configured branch contains those edits.

- Viewer: `data/viewer/boot.js`, `data/viewer/manifest.json`.
- Editor entry: `share/Character_Manager_Editor.html` -> `data/editor/boot.js` and manifest.
- Export construction/branch: `data/editor/scripts/export.js` (`EXPORT_BRANCH`).
- Session/DM: `data/session_viewer`, `data/dungeon_master`, `share/Dungeon_Master.html`; existing work is parked.
- Viewer metadata: `character-path`, `schema-version`, `github-owner`, `github-repo`, `github-branch`.
- Investigate a blank/error sheet in order: metadata -> boot fetch -> manifest paths/order -> character/library references -> mount.
