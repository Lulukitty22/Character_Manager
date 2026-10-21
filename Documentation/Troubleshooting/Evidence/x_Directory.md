# Audit Evidence Table of Contents

These files support the 2026-10-12 audits. Saved results and browser captures are historical observations, not proof of current fixes.

Run scripts from the repository root with Node.js. `run-audit.cjs` uses saved remote snapshots and mocked writes; it regenerates viewer/editor HTML, which is intentionally ignored by Git. Use baseline commit `60e7b60` to recover exact historical generated pages; do not overwrite evidence merely to claim a fresh audit.

`composition-detail.txt` was removed because it duplicates `composition-resolved.json` apart from its final newline. The two small `remote-*.html` files are original fetched shims and remain.

| File | Contents |
|---|---|
| [capella-AbilitiesFeats.txt](capella-AbilitiesFeats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-Combat.txt](capella-Combat.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-DDGameplay.txt](capella-DDGameplay.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-DDStats.txt](capella-DDStats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-Identity.txt](capella-Identity.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-mobile-stats.png](capella-mobile-stats.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [capella-Notes.txt](capella-Notes.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-Resources.txt](capella-Resources.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [capella-Spells.txt](capella-Spells.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-AbilitiesFeats.txt](carol-AbilitiesFeats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-ac-selected.png](carol-ac-selected.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [carol-DDGameplay.txt](carol-DDGameplay.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-DDStats.txt](carol-DDStats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-Identity.txt](carol-Identity.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-Inventory.txt](carol-Inventory.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-mobile-spells.png](carol-mobile-spells.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [carol-mobile.png](carol-mobile.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [carol-Notes.txt](carol-Notes.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-pre-migration.json](carol-pre-migration.json) | Preserves older inline Carol data for selective recovery, not as the accepted current build. |
| [carol-Resources.txt](carol-Resources.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [carol-Spells.txt](carol-Spells.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [composition-audit.cjs](composition-audit.cjs) | Resolves Carol, Capella and Seraphine against saved inputs to produce the composition snapshot. |
| [composition-resolved.json](composition-resolved.json) | Stores fully resolved character data used in the composition audit. |
| [console-results.json](console-results.json) | Stores captured browser/runtime diagnostic results from the audit. |
| [failure-repro.cjs](failure-repro.cjs) | Reproduces interrupted conversion and item-state failures using mocked persistence. |
| [failure-repro.json](failure-repro.json) | Stores the interrupted-conversion and quantity/state reproduction results. |
| [john-main.json](john-main.json) | Preserves the John character found only in the older main layout during the audit. |
| [remote-carol.html](remote-carol.html) | Preserves the fetched Carol viewer shim and its boot metadata. |
| [remote-session.html](remote-session.html) | Preserves the fetched Session View shim and its boot metadata. |
| [remote-snapshots.json](remote-snapshots.json) | Stores the seven remotely retrieved files used to seed the audit against the older local checkout. |
| [results.json](results.json) | Stores six-character rendering/calculation results and mocked conversion/save reproductions. |
| [run-audit.cjs](run-audit.cjs) | Reproduces renderer, calculation and mocked save/conversion checks, and generates disposable test HTML. |
| [seraphine-AbilitiesFeats.txt](seraphine-AbilitiesFeats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-DDGameplay.txt](seraphine-DDGameplay.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-DDStats.txt](seraphine-DDStats.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-editor-roundtrip.json](seraphine-editor-roundtrip.json) | Records field loss and item-type changes from a no-save editor harvest. |
| [seraphine-empty-spell-modal.png](seraphine-empty-spell-modal.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [seraphine-Identity.txt](seraphine-Identity.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-Inventory.txt](seraphine-Inventory.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-mobile-inventory.png](seraphine-mobile-inventory.png) | Captures the named character, surface or defect at the audited desktop/narrow viewport. |
| [seraphine-Notes.txt](seraphine-Notes.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-Resources.txt](seraphine-Resources.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
| [seraphine-Spells.txt](seraphine-Spells.txt) | Records the named character tab as observed through browser accessibility text during the audit. |
