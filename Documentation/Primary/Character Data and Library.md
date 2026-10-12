# Character Data and Library

Character JSON combines identity/build/state with inline entries or references to reusable records. Canonical library records use `schemaVersion`, `features` and `desc`; runtime adapters produce the older display shape. A JSON file parsing successfully does not prove its definitions survive normalization or resolve through the manifest.

- Definitions/defaults/imports: `data/common/scripts/schema.js`.
- Reference loading/resolution/save conversion: `data/common/scripts/library.js` (`resolveCharacterSync`, `syncCharacter`, `recordFromCharacterEntry`, `syncNameRecord`).
- Canonical adapter: `data/common/scripts/importers/library-records.js`.
- Index: `library/manifest.json`; record folders/indexes: `library/records`.
- 2026-10-12: inline-to-canonical conversion can erase spell rules; class/species sync can overwrite richer definitions. Repair before migrating recovered data.
- Carol: latest references missing31 definitions; older local/history inline data is recovery material. Fireball currently resolves as level0 with empty rules.
