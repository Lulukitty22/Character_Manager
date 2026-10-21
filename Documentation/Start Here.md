# Start Here

This project is an HTML/JavaScript D&D character manager with a viewer, editor and reusable library. Current work is **systems design**, using Carol's accepted tabletop build as a concrete example; her runtime data is still older. Firebase is the preferred hosted-backend direction, but no backend setup or character migration has begun.

## Choose a folder

| Folder | What to expect |
|---|---|
| [Systems](Systems/x_Directory.md) | Selected campaign, container, casting and active-effect rules, with genuine open questions. Start with Campaigns and Shared Data to resume the current design discussion. |
| [Character Sheets](Character%20Sheets/x_Directory.md) | Playable tabletop character sheets, separate from stored program data. Carol's sheet owns her accepted statistics, inventory and spell selections. |
| [Class Reference](Class%20Reference/x_Directory.md) | Supporting build provenance, weapon rules, costs and reusable mechanics. Calculation examples retain their assumptions and do not reopen selected builds. |
| [Implementation](Implementation/x_Directory.md) | Existing code locations, persistence defects, serving targets and repair dependencies. Use this before runtime work; it distinguishes tested observations from future requirements. |
| [Troubleshooting](Troubleshooting/x_Directory.md) | Dated runtime audits, remaining character defects and their evidence. These observations do not override the current character or system rules. |

Each folder's `x_Directory.md` describes its files. A topic's opening states its scope, implementation status, selected direction and open work; detailed rules have one authoritative home. Superseded drafts and activity logs are recoverable from Git instead of remaining competing instructions in this tree.

Documentation editing and sub-agent review instructions live in [AGENTS.md](../AGENTS.md). The pre-consolidation checkpoint is commit `60e7b60` on [backup/docs-baseline-2026-10-18-3_45AM](https://github.com/Lulukitty22/Character_Manager/tree/backup/docs-baseline-2026-10-18-3_45AM).
