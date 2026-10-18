# Repair Priorities

Updated 2026-10-18. Carol's tabletop baseline is accepted: Evoker Wizard 12 / Alchemist Artificer 3. Production JSON remains old. Current work is systems design, including DM/party-aware casting. Further archived DM expansion remains deferred. See [Start Here](../Start%20Here.md) and [Carol status](Carol%20Rebuild%20Status.md).

1. Settle [campaign/core architecture and hosted live state](../Systems/Campaigns%20and%20Shared%20Data.md). Retain selected [casting/effect workflows](../Systems/Spell%20Effects%20and%20Active%20State.md) and [container/scroll rules](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md). Agree on the first implementation milestone and acceptance criteria before coding.
2. Identify the narrow editor/schema/conversion changes needed for lossless persistence. Preserve unknown and nested data before migrating characters. Implementation remains a later phase.
3. Build and verify Carol's Manager sheet when dependencies are ready: formulas, casting, resources, saving and actual desktop/narrow appearance.
4. Resume Capella, then Seraphine audits and repairs. Confirm their unsettled mechanics; do not apply Carol's rules automatically.
5. Add deterministic Q&A and reviewed LLM import assistance after structured data is reliable.

Historical audit failures remain open until verified fixed. Old “build pending” statements do not override the accepted tabletop baseline. Evidence: [Troubleshooting](../Troubleshooting/Start%20Here.md), [Carol issue history](../Issues/Carol-Elfnein%20Issues.md), [Editor and Saving](Editor%20and%20Saving.md), and [Character Rendering](Character%20Rendering.md).
