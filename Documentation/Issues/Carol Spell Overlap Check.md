# Carol Spell Overlap Check

Outcome2026-10-16: optional confirmcard unanswered after severalminutes; follow user's no-unnecessary-duplication instruction: retain Cure Wounds (explicit backup exception), Faerie Fire and Identify; leave Detect Magic off by default. This is agent application of stated preference, not an explicit new user answer. Choice reversible; no production edits. Alchemist automatic grants/full2025 verification and bookplacement still open.

2026-10-16: user conditionally accepts Cure Wounds, Faerie Fire, Detect Magic and Identify, asking to avoid self/party duplication; explicitly accepts Cure Wounds overlap with Seraphine. Checked current local non-test character spell arrays, resolving reference names through library/manifest.json, plus Carol's archived pre-migration spells and approved rebuild list. This is recorded assignment evidence, not proof of live functionality or complete campaign-party membership/unsaved changes. No production changes.

| Proposed spell | Carol approved/archived/current | Other saved sheets | Decision |
|---|---|---|---|
| Cure Wounds | Not present in existing lists | Seraphine inline, prepared=true | User explicitly accepts second healer copy |
| Faerie Fire | Not present | None listed in checked sheets | Candidate retained |
| Detect Magic | Not present | Seraphine inline, prepared=true | Asked drop to avoid overlap, or retain backup; pending |
| Identify | Not present | None listed in checked sheets | Candidate retained |

Checked library/characters/{carol-elfnein,seraphine,capella-emerada-lugnica,aina-quickquiver,rall}.json. Other saved sheets may not all be party members. Capella reference names resolved via manifest; none of four. Carol has19 unresolved spell-reference names in current manifest, so absence there alone is insufficient: archived inline list also checked, none of four. Rebuild approved list has none. Do not treat missing records as an exhaustive valid spell inventory.

Seraphine Cure Wounds and Detect Magic are marked prepared but both have empty description/castingTime/range/duration/components and blank school. Existing audit's undefined-spell problem persists. Don't infer working rules from prepared flags. Guidance/Spare the Dying are also listed prepared, confirming prior reported assignment without validating their full rules.

Pointers: [Seraphine current](../../library/characters/seraphine.json), [Carol current](../../library/characters/carol-elfnein.json), [Carol archive](../Troubleshooting/Evidence/carol-pre-migration.json), [approved rebuild](../Class%20Reference/Carol%20Spell%20Loadout%20Review.md), [Artificer review](../Class%20Reference/Carol%20Artificer%20Spells.md).
