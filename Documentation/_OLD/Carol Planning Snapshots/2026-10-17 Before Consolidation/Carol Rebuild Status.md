# Carol Rebuild Status

Updated 2026-10-17. Most character choices are settled. Finish outstanding rules and the plain Markdown tabletop sheet first; derive program requirements next; implement the Manager later, as requested. This file is the current resume point; decision history is in Recent Notes.txt and detailed references below. Production Carol JSON has not been rebuilt.

## Settled

- Evoker Wizard 12 / Alchemist Artificer 3, total 15; Wizard-first, fixed-average 95 HP. No Sorcerer or Bladesinger features.
- STR 8 / DEX 16 / CON 14 / INT 22 / WIS 10 / CHA 10. INT includes DM-earned Indomitable +2. War Caster and Skill Expert selected.
- PB +5, spell attack +11, spell DC 19. Saves STR -1 / DEX +3 / CON +2 / INT +11 / WIS +5 / CHA +0. War Caster gives Advantage on concentration saves; DC10 success 87.75%.
- 2024 Human + Alert; Sage background now replaces Artisan in working draft; Magic Initiate(Wizard) replaces Crafter; Mage Armor freecast and two additional cantrip choices selected. Initiative +8, speed 30ft. Replacement bodies remain lore/setpieces, not automatic extra lives or saved current memories; backup roughly level8. Autoscores adventuring mechanics, if any, still need clarification.
- Robes + Mage Armor: AC16 for8h; Shield temporarily21. Guise/Faust retained as spell, Tenser excluded. Harp, Silver/Gold focus and old memory mechanics removed.
- Shared caster14 slots, levels1-7: 4/3/3/3/2/1/1. Actual spell access Wizard6 / Artificer1; seventh slot for upcasting.
- Spell choices selected: 21 leveled +10 cantrips. Three16-entry books: Combat16, Cantrips10, Workshop/Alchemy5. New Mind Sliver/Shocking Grasp occupy Wizard class choices; Sage supplies Mage Hand/Prestidigitation plus Mage Armor freecast. All eligible contents ready under chosen house rule; books do not multiply slots or class cantrip choices. Detect Magic omitted provisionally for party overlap; backup Cure Wounds approved.
- Skills working allocation: Arcana+16, Investigation+16 (Expertise); History+11, Perception+5. Persuasion untrained+0 after Artisan removal. Wizard Insight+5 and Human Medicine+5 now selected; background/class skills no longer duplicate. Nature+11 is the latest working choice for the revised Artificer multiclass skill.
- Native tools with Sage: Calligrapher; Tinker via revised multiclass grant (secondary final-book transcription). Former background/feat Glassblower/Smith/Mason/Potter native proficiencies removed; Manifold still supplies them conditionally. Alchemist's Supplies and Herbalism Kit proficiencies confirmed by official class overview. New physical tool-kit ownership remains separate.
- Approved equipment: Aetherlock, robes, books, Alchemist's Supplies, Herbalism Kit, component pouch, Identify100gp pearl, two separate Bags of Holding. Wand of the War Mage+1 and Manifold Tool ownership now approved as earlier downtime acquisitions; Wand/Manifold are permanent prior acquisitions; four plans Wand/Manifold/Goggles/Jug, usual replicas Goggles+Jug selected. Exact historical purchase-versus-crafting ledger remains unspecified. Wand + Manifold + Aetherlock use all three normal attunement slots; Aetherlock requires an Artificer, selected. No gold changes or bag nesting assigned.
- Aetherlock: two-handed rifle, no Light, range80/240ft; ordinaryslug2d10+INT=17average; six unrestricted chambers; INT-guided proficient aiming+11. Every weapon attack may release a round, including a Spellround. Actual donor must cast eligible Instantaneous/1-round spell into a fresh round, paying slot/materials in advance. Snapshot donor spell parameters at manufacture. Spell replaces ordinary gun damage; normal spell saves remain. Carol concentrates normally. No rest-refilled ammunition.

## Remaining rules and choices

ManufacturingTIMEselected2026-10-17:10minutes per PAID SLOTlevel+actualcastingtime. No need reask. Gold/materialsSELECTED10gp per Spellround, flat across levels, plus spellcomponents. No historicalgolddebit. Hit/save rules resolved: each spell's normal defenses, no extraAoEACgate.

Latest Aetherlock2026-10-17: Two-Handed/noLight, ordinary2d10+6, range80/240; compatibleTouch/spells delivered at gunrange; actualimpactincludingmiss; fuzeprogrammingaspartfire. TrueStrikeRadiant is **freshwieldercast**, neverstoredround/fuze data; directcreaturehitonly, notAoE. Guise2shots OR TrueStrike1shot; user possible2shots/oneenhanced misunderstanding explicitly clarified, no new cantrip-substitution feature granted. Impact/airburst fuzes, normal spell defenses, levelled-round time/cost and Artificer attunement are selected. Remaining payload compatibility and HE-FRAG recipes are open; cantrip rounds are approved at 10gp/10 minutes with donor scaling stored.

User selects Sage for the working draft and requests full relationship audit. [Build Sources](../Class%20Reference/Carol%20Build%20Sources.md) maps every grant and the tool/item distinctions. Remove Artisan/Crafter grants rather than stacking them; all final ability scores/HP/PB unchanged. Skill remap now selected: Wizard Investigation/Insight, Human Medicine, Sage Arcana/History. Mage Armor freecast and new Mind Sliver/Shocking Grasp selected; utility Mage Hand/Prestidigitation assigned to Magic Initiate. More item candidates saved in Equipment Shopping; none automatically granted.

1. Cantrips complete: Mind Sliver/Shocking Grasp selected, source map updated. Mage Armor freecast selected. Sage Arcana/History; Wizard Investigation/Insight; Human Medicine; Nature+11 working Artificer choice. No duplicate skill grants; Persuasion untrained. Crafter/Potter native grant removed. Class grants are secondary-transcribed; primary full chapter still gated.
2. Artificer item choices: final-book-labelled transcription gives four plans/two active creations; selected spell grant pair matches it. Elixir rules now summarized in Carol Artificer Items and Elixirs.md. Treat this as secondary verification, not official full-chapter access. Wand/Manifold ownership now approved; permanent Wand/Manifold and four plans Wand/Manifold/Goggles/Jug now selected, usual replicas Goggles+Jug. Other shopping candidates remain proposals.
3. Aetherlock impact SELECTED: trigger at actual collision; DM determines miss location; normal target restrictions remain. Range/properties, normal spell defenses, crafting time/cost, impact/airburst fuzes and Artificer attunement are selected. Remaining payload/True Strike interactions, HE-FRAG remains open; cantrip rounds approved at 10gp/10 minutes with donor scaling stored.
4. Final equipment/component pass and physical tool kits; Guise full effects found in Tasha transcription, including required500gp planar object now approved in starting essentials. Keep source confidence explicit. Do not import old sheet arithmetic or merged Bladesong/harp effects.
5. Clarify any active Autoscore mechanics; replacement-body lore itself is already addressed.

## Implementation after rules

First finish the plain sheet at Character Sheets/Carol Elfnein.md, then derive/design features from Systems/Character Sheet Requirements.md. Only in a later implementation phase build clean character data, container/stored-cast structures and editor persistence; test webpage appearance, calculations, resource use/rest, level changes and save/reload. Current validator skips library/characters, so a schema pass alone is insufficient. Read-only calculation fixture passed95HP/sharedcaster14/slot array using fallback data; live library/browser verification remains.

Named books/bags/nested containers and consumable learn-or-cast sources belong in the existing Systems document below. Some policies remain proposals; do not silently implement. Capella/Seraphine repairs and DM/party systems remain on hold. Preserve user's Documentation/_OLD archive move. Earlier above20 editor change passed syntax only; browser check pending.

## Pointers

- [Equipment shopping](../Class%20Reference/Carol%20Equipment%20Shopping.md)
- [Clean draft](../Issues/Carol%20Clean%20Sheet%20Draft.md)
- [Books and grants](../Class%20Reference/Carol%20Books%20and%20Grants.md)
- [Stats and equipment](../Class%20Reference/Carol%20Stats%20and%20Equipment%20Review.md)
- [Spell loadout](../Class%20Reference/Carol%20Spell%20Loadout%20Review.md)
- [Skills and crafting](../Class%20Reference/Carol%20Skills%20and%20Crafting.md)
- [Tool options](../Class%20Reference/Carol%20Tool%20Options.md)
- [Aetherlock](../Class%20Reference/Aetherlock%20Engineered%20Rounds.md)
- [Creation and replacement bodies](../Class%20Reference/Carol%20Creation%20and%20Replacement%20Bodies.md)
- [Shared systems](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md)












2026-10-17 selected Aetherlock delivery: compatible personal Self Spellrounds use a fuze setting selected at firing. Self applies to the wielder without a projectile; Impact launches and applies to the hit target. Same round, no separate blank recipe. Transferring a Self spell is an explicit weapon house rule. Existing duration eligibility and donor snapshot remain; reaction timing and unwilling-recipient resolution are still open.

2026-10-17 Shield rounds: USER selects Carol's Reaction when self/visible ally is hit, WITH aiming roll. Loaded/ready weapon and round required; round+Reaction consumed; success protects triggering hit through start Carol next turn. Delivery threshold and Self-mode aiming still open. No general offensive reaction firing.

2026-10-17 Shield ally delivery threshold SELECTED: fixed DC10 with gun aim d20+11 for willing recipient, not recipient AC. Normal gun attack/range rules remain; no ordinary bullet damage. Successful reaction delivery can negate triggering hit with +5 AC, ends start Carol next turn. Self-mode aiming treatment remains open.

2026-10-17 USER settles stored Evoker effects: qualifying donor Empowered Evocation bonus stored once at manufacture (+6 for Carol); no release-time double bonus or Sculpt safe pockets for rounds. Direct casting retains ordinary Sculpt Spells. Next topic item origins/plans, then HE-FRAG profile and starting inventory.

## Selected item arrangement — 2026-10-17

USER approves permanent Wand of the War Mage+1 and Manifold Tool as earlier acquisitions, outside class replication capacity. Four known plans: Wand of the War Mage+1, Manifold Tool, Goggles of Night, Alchemy Jug. Usual two active replicas: Goggles of Night and Alchemy Jug. Backup Wand/Manifold plans remain known, not additional active copies. Aetherlock remains gifted; the two Bags of Holding remain separately owned, not automatically replicated. Attunements remain Aetherlock+Wand+Manifold (3/3); Goggles/Jug require none. Exact permanent purchase/crafting history and gold ledger remain unspecified; no gold debit invented.

## HE-FRAG — selected 2026-10-17

USER approves the revised grenade effect adapted to Aetherlock: 5d6 Piercing in a20ft-radius sphere; each creature makes DC15 DEX save, half on success. Impact or Airburst fuze under selected rifle delivery rules. Replaces ordinary slug damage, no spell slot, no Evoker damage bonus. Friendly fire applies. Damage mathematical mean17.5 before saves. Custom rifle adaptation of the2024 grenade, not a published Aetherlock item. Manufacturing time/material price, acquisition cost and starting quantity remain open; Spellround10gp price does not automatically apply.

## Starting essentials — selected 2026-10-17

USER approves: physical Tinker's Tools; physical Calligrapher's Supplies; engraved planar object worth500gp for Tasha's Otherworldly Guise (reusable/nonconsumed; cosmetic form open); four ordinary Potions of Healing; ink/paper, rope, bedroll, waterskin and seven days' rations. Add to existing Alchemist's Supplies, Herbalism Kit, component pouch and Identify100gp pearl; do not duplicate those. Potions are physical consumables, not daily Experimental Elixirs. No invented current gold debit. Ammunition stock, HE-FRAG manufacture cost/time, protective book upgrades and remaining unusual payload interactions still open.

2026-10-17 Starting ammo SELECTED:3 Cone of Cold(slot5),3 HE-FRAG,2 Shield;8 carried, six-chamber loading unspecified. Proposed20slugs/2CureWounds not selected. HE-FRAG conversion proposal1grenade+1emptycase+5gpparts+10minTinker; custom recipe awaiting answer, grenade supply/price still open. Enduring Spellbooks explained, not selected. Remaining interaction examples are multiray payload and Self-Shield aiming, not reopening core spells.

## HE-FRAG conversion recipe — selected 2026-10-17

USER approves: consume1 complete Fragmentation Grenade +1 empty Aetherlock casing +5gp fitting/programming parts; spend10minutes using Tinker's Tools/proficiency to make1 HE-FRAG rifle round. No spell slot. This is a custom conversion of an existing grenade, not raw explosive manufacture. Grenade source/price remains separate and unspecified, as does supply of empty casings; no automatic free inputs, no invented current gold debit. Supersedes earlier recipe-pending labels.

2026-10-17 CURRENT AMMO:USER adds20ordinaryslugs+2CureWounds1. Final starting carriedstock30=20slugs/3ConeCold5/3HEFRAG/2Shield1/2CureWounds1. Sixchambers only, loadedarrangementunspecified. HEFRAG recipe selected1grenade+case+5gp+10minTinker. Enduringbook protection not selected; remaining spell edgecases still open.

## Enduring books — selected 2026-10-17

USER approves all three existing books as permanent Enduring Spellbooks: Combat, Cantrips, Workshop/Alchemy. Preserve their names, contents, tab order and campaign16-entry capacity; do not add three extra books or expand capacity. Common magic item, no attunement; book and writing cannot be damaged by fire/water and do not deteriorate with age. Not blanket indestructibility. Outside the four known plans/two active replicas. No historical cost debit invented. Licensed2024 source: https://roll20.net/compendium/dnd5e/Items%3AEnduring%20Spellbook?expansion=33359 .

2026-10-17 ShieldSelfselectedNOaimroll; Reaction+loadedround consumed, alreadyheld/readyrifle, normaltrigger+duration. AllyShieldaim remains fixedDC10. All3books now Enduring permanent selected. Multiray normalspellrolls explained. Remaining weapon review: oldextraabilities status, other unusual reaction/target recipes, logistics/startingchambers; no reaskSelfShield/books.
