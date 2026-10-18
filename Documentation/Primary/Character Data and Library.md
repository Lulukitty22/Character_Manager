# Character Data and Library

Character JSON combines identity, build and owned state with inline entries or references to reusable records. Canonical library records use `schemaVersion`, `features` and `desc`; runtime adapters produce the older display shape. Parsing JSON does not prove that normalization preserves definitions or that references resolve through the manifest.

## Existing code and audit findings

- Definitions/defaults/imports: `data/common/scripts/schema.js`.
- Reference loading and save conversion: `data/common/scripts/library.js` (`resolveCharacterSync`, `syncCharacter`, `recordFromCharacterEntry`, `syncNameRecord`).
- Canonical adapter: `data/common/scripts/importers/library-records.js`.
- Index: `library/manifest.json`; reusable records: `library/records`.
- The 2026-10-12 audit found that inline-to-canonical conversion can erase spell rules and class/species synchronization can overwrite richer definitions. Repair before migrating recovered data.
- The prior Carol audit found 31 missing definitions; Fireball resolved as level 0 with empty rules. Older inline/history data is recovery material. These findings have not been freshly reverified in this documentation cleanup.

## Selected design and current discussion

[Campaigns and Shared Data](../Systems/Campaigns%20and%20Shared%20Data.md) owns the authoritative architecture: core definitions, campaign content, account memberships, campaign roles, owned instances and live state. Firebase is preferred; no setup or migration has begun.

Linked entries refer to their source definitions and reflect source edits. Custom or duplicated records remain independent. Preserve owned quantities, contents, charges, prepaid casting snapshots and historical results. Pending actions and active effects resolve current linked definitions. Customization makes the entire definition independent; the earlier field-level inheritance model is superseded. Only explicitly assigned core maintainers publish global changes.

Every placement in another folder, campaign or campaignless location creates an independent copy. The original remains until separately approved deletion. Campaign DMs approve destination insertion and campaign character changes; the owner controls campaignless saves.

A character copy does not automatically import campaign definitions. Preserve disabled missing-item/spell entries, their state and contents until manual import/relink restores the same entries. Do not duplicate quantity or stock. Definition identity includes origin; matching names alone is insufficient.

Detailed behavior: [casting/effects](../Systems/Spell%20Effects%20and%20Active%20State.md), [containers/scrolls](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md), and [Editor and Saving](Editor%20and%20Saving.md). These are design requirements, not claims about implemented runtime behavior.
