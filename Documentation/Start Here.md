# Start Here

Updated 2026-10-18. This is a D&D character manager with an HTML/JavaScript viewer and editor, reusable library records, and GitHub-backed saves. Current work is **systems discussion and design**. Carol's accepted tabletop build supplies examples for reusable features; her runtime JSON still contains older data.

## Reading order

1. [Current Handoff](Current%20Handoff.md) — current phase and working-tree cautions.
2. [Campaigns and Shared Data](Systems/Campaigns%20and%20Shared%20Data.md) — current discussion, selected architecture and remaining decisions.
3. [Character Sheet Requirements](Systems/Character%20Sheet%20Requirements.md) — feature index and links to detailed designs.

Firebase is the preferred backend direction. No Firebase project setup, deployment or runtime migration has started. DM/party coordination is included in casting design. Capella and Seraphine repairs, and further expansion of archived DM features, remain deferred.

## How the system fits together

The core catalogue contains reusable definitions such as spells and items. Campaigns add their own definitions and house rules. Characters own item instances with quantities, contents and charges; those instances refer to definitions without becoming the definitions themselves.

A gameplay request reserves resources, waits for the required approval and timing, then resolves rolls, payments and effects into recorded state. Stored scrolls preserve paid casting snapshots. Linked definitions remain live for pending actions and active effects. Custom/duplicated definitions remain independent; paid snapshots and completed history are preserved. Owners control campaignless characters. Solo campaign owners have player/edit and DM rights, and switch to DM mode to approve their requests through the same system. Tabs default to public with per-tab privacy; notifications are public unless hidden at submission.

The existing application persists GitHub files. The proposed managed backend would provide accounts, campaign permissions and authoritative live state while the user's PC is off. See the architecture document for the distinction between existing and intended behavior.

## Where current decisions live

| Topic | Authoritative document |
|---|---|
| Campaigns, accounts, copying, sharing, offline behavior and hosting | [Campaigns and Shared Data](Systems/Campaigns%20and%20Shared%20Data.md) |
| Casting requests, resource holds, response polls, rolls and effects | [Spell Effects and Active State](Systems/Spell%20Effects%20and%20Active%20State.md) |
| Containers, accessibility, capacity, scroll identity and scribing | [Spell Containers and Consumable Sources](Systems/Spell%20Containers%20and%20Consumable%20Sources.md) |
| Carol's accepted build and equipment | [Carol Elfnein — tabletop sheet](Character%20Sheets/Carol%20Elfnein.md) |
| Aetherlock actions, ammunition, fuzes and canisters | [Aetherlock Engineered Rounds](Class%20Reference/Aetherlock%20Engineered%20Rounds.md) |
| Current ammunition costs and calculations | [Aetherlock Costs and Damage](Class%20Reference/Aetherlock%20Costs%20and%20Damage.md) |
| Build sources and source confidence | [Carol Build Sources](Class%20Reference/Carol%20Build%20Sources.md) |
| Repair sequence and verification dependencies | [Repair Priorities](Primary/Repair%20Priorities.md) |

The user's current decisions take precedence over archived sheets and older comparison drafts. A topic document owns its detailed policy; indexes and status notes should link to it rather than maintain another complete copy. Historical research is evidence, not a competing approved build.

## Directory map

| Directory | Purpose / entry point |
|---|---|
| [Character Sheets](Character%20Sheets/Carol%20Elfnein.md) | Human-readable tabletop sheets, separate from runtime data. |
| [Primary](Primary/Carol%20Rebuild%20Status.md) | Current status and code pointers. [Recent Notes](Primary/Recent%20Notes.txt) is the dated history. |
| [Class Reference](Class%20Reference/Start%20Here.md) | Rules, sources, calculations and historical alternatives. |
| [Issues](Issues/Carol-Elfnein%20Issues.md) | Character defects and older repair/build drafts. |
| [Systems](Systems/Campaigns%20and%20Shared%20Data.md) | Current reusable system designs. |
| [Troubleshooting](Troubleshooting/Start%20Here.md) | Repository and character-composition audits. |
| [Troubleshooting/Notes](Troubleshooting/Notes) | Original issue logs. |
| [Troubleshooting/Evidence](Troubleshooting/Evidence) | Reproduction scripts, snapshots, screenshots and test pages. |
| [_OLD](_OLD/Archive%20Index.md) | Archive index; historical material is not current instruction. |

## Existing program pointers

[Repository and branches](Primary/Repository%20and%20Branches.md), [HTML loader](Primary/HTML%20Loader.md), [character data/library](Primary/Character%20Data%20and%20Library.md), [rendering/calculations](Primary/Character%20Rendering.md), [editor/saving](Primary/Editor%20and%20Saving.md), [ability-score policy](Primary/Ability%20Score%20Policy.md), [spellbook policy](Primary/Spellbook%20Policy.md), and [LLM assistance](Primary/LLM%20Assistance.md).

When a decision changes, replace its current-state statement and append one dated entry to Recent Notes. Keep evidence in Troubleshooting and alternatives in Class Reference. Leave unanswered questions explicit; do not silently turn proposals into decisions.
