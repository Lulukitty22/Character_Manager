# Campaigns and Shared Data

Updated 2026-10-18. This document records the campaign architecture, Firebase research and decisions made during the systems discussion. It is a design document: no Firebase project has been configured, and no runtime migration has started.

## Current direction

Keep the HTML/JavaScript application and core catalogue separate from private, live campaign data. GitHub can continue hosting source code, static assets and versioned reference files. A managed backend would handle accounts, campaign permissions, requests, resource reservations, rolls, effects and logs.

**Firebase is the user's preferred backend direction.** The exact Firebase products, schema, authentication method and billing configuration remain undecided. Hosting must not require the user's PC to stay online. Other character audits remain deferred while this architecture is clarified.

## Data scopes

| Scope | Rules and decisions |
|---|---|
| Core catalogue | Standard spells, items, feats, species and other reusable definitions are shared across campaigns. Records need stable identities, source references and rules versions. |
| Campaign content | Custom definitions and house rules belong to their campaign. They must not overwrite the global core or appear in another campaign automatically. |
| Accounts and membership | One account can participate in multiple campaigns and can create campaigns. Roles are campaign-specific. A solo campaign has one person, not necessarily one character; its owner has both player/edit and DM rights. |
| Character saves | A character belongs to a campaign, folder or campaignless location. Placing it elsewhere creates an independent copy; it does not synchronize the two saves. |
| Owned items and scrolls | An owned instance has its own quantity, container, charges, ownership and saved casting parameters. It is distinct from its reusable definition. |
| Live campaign state | Turns, requests, held resources, response polls, rolls, active effects and logs belong to the campaign. DM-only information requires access controls. |

Linked entries are live references to their source definitions. Editing a source changes what linked uses resolve to; custom or duplicated entries are independent records and retain their values when the original changes. Match records by identity and origin, not by name alone. Proposed lookup uses a campaign-specific definition before the core definition.

Customizing a linked entry for local use makes the whole definition independent, superseding the earlier field-level inheritance model. This is distinct from authorized publication of an edit to the source definition, which still affects existing links. Owned quantity, charges and contents remain instance state; changing them does not itself customize the reusable definition.

Linked pending actions and already-active effects use the current definition, including changes published while they are pending or active. Revalidate pending costs, targets and eligibility against current values before execution. Do not reset owned quantities, charges or contents, or rewrite prepaid casting snapshots, completed rolls or historical results. Custom/duplicate definitions remain wholly independent; none of their fields continue inheriting from the original.

## Publication and approval

Players can propose campaign definition edits; the campaign DM approves publication. Once published, linked entries resolve the current definition through their references. There is no additional per-character acceptance gate for each library correction.

Only explicitly assigned core maintainers may publish global core changes. Campaign DM status alone grants no core publishing rights. Assignment/revocation of maintainers and the detailed publication process still need design.

Campaign DMs also approve character insertion, deletion, modification and replacement, including ordinary build/equipment edits as well as gameplay requests. This is separate from approving membership or publishing a definition.

## Character placement: copy only

Every placement in another folder, folderless location, campaign or campaignless location creates an **as-is copy**. The original remains until its deletion is separately requested and approved. There is no automatic cut-and-paste operation, linked deletion or cross-campaign synchronization.

For example, copying Carol from Campaign A into Campaign B does not make later damage, inventory changes or progression in B affect the original in A. The destination campaign DM must approve the new character's insertion.

The custom-content exception below qualifies "as-is": copying a character does not automatically import campaign-specific definitions. Rules for copying history, active effects, pending holds and tab privacy still need detailed design. The owner controls campaignless saves; destination campaign approval still applies when inserting a copy into a campaign.

## Custom content: disabled placeholders and manual imports

Campaign-specific items, spells and other definitions stay in their source campaign. They are not automatically imported with a character copy. Users should be able to copy or import definitions manually, individually or in bulk, between campaigns and folders.

If Carol has Campaign A's custom Aetherlock and is copied into Campaign B without that definition, her destination save keeps a **disabled missing-item entry**. It is not silently deleted. Preserve the owned entry's reference, state and contents, but grant no actions or bonuses from the unresolved definition. The original in A is unchanged.

Manually importing and relinking the definition restores that existing entry. It must not create a second owned item or duplicate its quantity, charges or children. Destination campaign approval still applies; a manual import must not accidentally publish something globally.

Core definitions remain shared and do not need to be duplicated for each character. Missing campaign definitions must not cause unrelated core-linked inventory to disappear. Nested containers, paid scroll snapshots, hidden source data and mapping to existing destination definitions require further design before implementation.

## Campaign membership

Selected admission flow:

1. The DM supplies an invite link or code.
2. The person submits a join request.
3. The DM approves membership.
4. The person receives player access to that campaign.

A pending request is not membership and grants no campaign content or gameplay authority. Joining does not grant DM or core-maintainer privileges, automatically approve a character, or approve custom content imports.

The sign-in method, role promotion, revocation and campaign ownership transfer are not yet defined. No accounts or invitations have been created through this discussion.

## Campaignless and solo authority — selected 2026-10-18

The owner can create, edit, copy and delete their campaignless characters, and can create campaigns. A solo campaign means one participating person, not one character. Its owner has both player/edit and DM rights, can insert characters and receives approval prompts. To approve their own requests, the owner must switch to DM mode and use the same approval system. There is no solo bypass or automatic self-approval. Other campaign permissions remain scoped to the relevant campaign.

## Character-sheet visibility

Selected 2026-10-18 during documentation clarification: character tabs are **public by default** to fellow campaign players. The owner can make individual tabs private, including Inventory or D&D statistics, and may hide every tab. Other players still see the character's name in its entry. Private tab content is visible only to the owner and the campaign DM(s).

This replaces the earlier requirement to explicitly share each section before any party view exists. Membership still does not grant editing/control rights. Read permissions must be enforced by the backend, not merely by hiding tabs. DM-only content remains private.

Action/effect notifications are public by default even when their source spell, item or value belongs to a private tab. At submission, the requester can choose to hide the spell/action from other players. This applies to casting, consuming items, adjusting values and other gameplay requests. Keep tab access and submitted-action visibility separate: a public notification does not grant access to the source tab. Hidden details remain available to the owner and DM(s); the exact notification/log fields and aggregate-stat presentation still need design. Copied-character privacy and previously exported data after revocation remain open.

## Offline behavior and server authority

Without an internet connection, the client makes no authoritative campaign changes. Unsent edits can remain in the current open page's memory. Refreshing, closing the tab or losing power may lose them. No durable offline draft store, automatic recovery or automatic replay is required.

On reconnect, retrieve current server state and permissions before submitting retained inputs. Keep those inputs separate from fresh campaign state where possible. Revalidate costs, targets, eligibility and revisions; never replace current server data with a stale full-character copy.

If the connection dropped after submission, check the action's server status before retrying. Do not assume failure and spend or resolve twice. Existing server reservations are not released simply because the client disconnects.

Other authorized campaign events continue while a player is absent. Players can request fixes or retcons afterward, such as healing damage incurred while away, but the DM must approve them. Record the correction explicitly instead of silently rewriting history. Detailed correction and dependent-event handling remain open.

Proposed interface requirements: clearly identify offline, stale and unsent state; never describe an in-memory edit as saved or approved. A required DM approval still waits for an authorized DM even though the hosted service remains available.

## Current GitHub implementation

Inspected during the architecture discussion; no runtime changes were made:

- `data/common/scripts/github.js` reads and replaces repository JSON using file SHAs and creates commits. It is not a live reservation or campaign transaction API.
- `data/editor/scripts/export.js` builds a thin HTML loader and currently targets `staging` through `EXPORT_BRANCH`.
- `data/viewer/boot.js` fetches remote assets using `cache: "no-store"`. The existing export is not a self-contained offline sheet.
- Reusable definitions and characters live under `library/records` and `library/characters`. Existing editor harvesting and conversion can lose fields; that must be repaired before migration.
- The targeted common/editor source search did not find a configured managed realtime backend. This was not a complete dependency audit.

GitHub can remain source control, static distribution and an export/backup destination. Repository commits are not recommended as the live transport for polls, approvals and resource holds. The issue is concurrency, permissions and coordinated state changes, not an established universal five-minute cache delay.

Sources: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) describes static hosting. The [Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) requires the current SHA when replacing a file and documents conflict responses.

## Hosted backend comparison

The following published limits were checked on 2026-10-17. They are research findings, not a guarantee of permanent free service or measured application capacity.

| Option | Relevant free-tier features and limits | What still needs evaluation |
|---|---|---|
| Firebase Auth and Realtime Database, with a static frontend | Spark includes 100 simultaneous Realtime Database connections, 1 GB stored and 10 GB downloaded per month. The service supports authenticated rules, realtime listeners and transactions. | Validate campaign isolation, private fields, concurrent holds and one-time resolution. Not every Firebase product is free on Spark. Connections are not the same as human players. |
| Supabase, with a static frontend | Free tier includes a 500 MB database, 200 peak Realtime connections and 2 million Realtime messages per month. Postgres, Auth and row policies fit campaign relationships. | Free projects pause after one inactive week; the published limit was two active free projects. Pro started at USD 25/month. Many campaigns can share one service project. |
| GitHub only | Existing JSON editing, version history and static distribution can continue. | Not recommended as the authoritative store for live multiplayer requests and reservations. |
| Backend on the user's PC | Technically possible. | Does not meet the requirement that others can update while that PC is off. |

Firebase is preferred because the user is comfortable with Google. No Firebase project, product configuration, subscription or deployment has been created. A small capability test should validate the requirements before a migration is chosen. A provider project is not the same thing as one D&D campaign.

Sources: [Firebase pricing](https://firebase.google.com/pricing), [Firebase reads, atomic writes and transactions](https://firebase.google.com/docs/database/web/read-and-write), [Firebase security rules](https://firebase.google.com/docs/database/security), [Supabase pricing](https://supabase.com/pricing), [Supabase row security](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Supabase realtime](https://supabase.com/docs/guides/realtime/postgres-changes).

## HTML and live-state requirements

- Retain an HTML/JavaScript viewer. A hosted HTTPS page can load a campaign and character, then authenticate for private data.
- Test downloaded HTML, browser origins and authentication before promising identical behavior from `file://` URLs.
- A genuinely offline snapshot would need bundled data and runtime assets; the current thin loader does not provide that. Export scope remains undecided.
- Enforce campaign membership, DM authority and private fields in backend access rules. Public GitHub files must not contain private campaign records, and browser bundles must not contain administrative service secrets.
- Reservations and resolution require coordinated validation, stable action identities and a single authoritative commit. Realtime notifications should follow durable state changes. Broadcasting alone is not storage.
- Preserve the existing review, reservation, approval, response, roll and effect workflows described in [Spell Effects and Active State](Spell%20Effects%20and%20Active%20State.md).

## Remaining decisions

1. Remaining campaign edit/control permissions, copied-state boundaries and ownership transfer. Campaignless ownership and solo owner/DM authority are selected above.
2. Core-maintainer assignment/publication procedures; manual import scope and destination relinking. Core publishing requires an explicitly assigned maintainer role.
3. Notification/log details for hidden actions, aggregate-stat presentation and permissions retained on character copies. Public notification defaults and per-tab privacy are selected above.
4. Firebase product, authentication and budget choices, followed by a capability test if authorized.
5. Storage adapters, lossless migration and import/export behavior before runtime implementation.

Other selected systems are recorded in [Spell Containers and Consumable Sources](Spell%20Containers%20and%20Consumable%20Sources.md), [Character Sheet Requirements](Character%20Sheet%20Requirements.md) and [HTML Loader](../Primary/HTML%20Loader.md).
