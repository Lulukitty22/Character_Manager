# Character_Manager

A GitHub-backed D&D character manager built around thin HTML shims and remotely loaded runtime code.

## Repo Layout

- `library/characters/`
  - Persisted character JSON files.
- `library/records/`
  - Reusable non-character content such as spells, traits, items, feats, resources, classes, species, and tags.
- `library/manifest.json`
  - Shared library manifest consumed by the viewer and editor loaders.
- `data/common/`
  - Shared schema, GitHub helpers, library loaders, renderers, and styles.
- `data/viewer/`
  - Remote viewer boot and manifest used by exported character sheets.
- `data/editor/`
  - Remote manager/editor boot, manifest, editor modules, and editor-only styles.
- `share/Character_Manager_Editor.html`
  - Permanent local entrypoint for the manager/editor.
- `share/examples/`
  - Hard-coded UI prototypes and visual targets.

`README.md` explains the stable shape of the repo. `STAGING_PLAN.md` tracks current migration status and must be updated whenever structure, paths, or workflow decisions change.

## Thin-Shim Model

This project now treats HTML files as tiny boot shims:

- Exported viewer HTMLs contain only metadata, a mount node, and a small bootstrap that fetches `data/viewer/boot.js` from GitHub.
- `share/Character_Manager_Editor.html` does the same for `data/editor/boot.js`.
- Shims do not embed a character snapshot, renderer bundle, or fallback app shell.
- After the first fetch succeeds, loading states, error states, and UI all come from the remotely loaded runtime.

That keeps the sent HTML files stable while letting the repo update the viewer and editor behavior over time.
