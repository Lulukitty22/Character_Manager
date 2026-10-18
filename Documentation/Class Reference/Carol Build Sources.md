# Carol Build Sources

Updated 2026-10-17. Source map for the plain tabletop draft, not program schema. **Sage replaces Artisan in the current working draft.** Pending selections are not grants. Owned magic items have their own activation/attunement requirements. [Sheet](../Character%20Sheets/Carol%20Elfnein.md); [resume](../Primary/Carol%20Rebuild%20Status.md).

## Dependency tree

```text
Carol — total level 15, PB +5
├─ Species: Human 2024
│  ├─ Resourceful: daily Heroic Inspiration
│  ├─ Skillful: Medicine proficiency
│  └─ Versatile: Origin feat Alert → initiative+5, ally initiative swap
├─ Background: Sage 2024 (replaces Artisan)
│  ├─ Ability increases: +2INT/+1CON in reconstructed point-buy draft
│  ├─ Skills: Arcana, History
│  ├─ Tool proficiency: Calligrapher's Supplies
│  └─ Origin feat: Magic Initiate(Wizard)
│     ├─ Mage Hand and Prestidigitation (INT)
│     └─ Mage Armor → free level1 cast1/Long Rest; extra casts use slots
├─ Starting class: Wizard 12
│  ├─ INT/WIS save proficiencies, Wizard HP/spells/rituals/recovery
│  ├─ Two skills → Investigation and Insight
│  ├─ Scholar → Arcana Expertise
│  ├─ Subclass: Evoker → Savant/Potent Cantrip/Sculpt/Empowered Evocation
│  └─ Level4/8/12 feat choices
│     ├─ Ability Score Improvement → +2INT
│     ├─ War Caster → +1INT and casting/concentration benefits
│     └─ Skill Expert → +1DEX, Perception proficiency, Investigation Expertise
├─ Multiclass: Artificer 3
│  ├─ Tinker proficiency, one skill (Nature selected), armor training
│  ├─ Artificer spellcasting, Mending, temporary Tinker's Magic gear
│  ├─ Replicate Magic Item → plans/active-capacity tracking
│  └─ Subclass: Alchemist → supplies/Herbalism proficiency, potions, elixirs, spells
├─ DM-earned trait: Indomitable → +2INT, already included in22
└─ Equipment (not class levels or permanent training)
   ├─ Manifold → chosen artisan-tool form +conditional proficiency; attuned/used
   ├─ Wand of the War Mage+1 → spell attacks+1 while held/attuned
   └─ Aetherlock → approved custom aiming/round mechanics; other rules pending
```

## Sage swap audit

| Relationship | Before: Artisan | Working draft: Sage |
|---|---|---|
| Background skills |Investigation, Persuasion |Arcana, History |
| Wizard's2 skills |Arcana, History |Investigation and Insight (selected) |
| Expertise |Arcana via Scholar; Investigation via Skill Expert |Both preserved through source remap |
| Persuasion |Proficient+5 |Untrained+0; Human choice used for Medicine |
| Human skill |Open Medicine/Insight |Medicine selected; Wizard supplies Insight, so both proficient+5 |
| Native background tool |Glassblower |Calligrapher |
| Origin feat |Crafter |Magic Initiate(Wizard) |
| Native feat tools |Smith/Mason/Potter |Removed; Manifold can still provide each while used |
| Other Crafter benefits |20% nonmagic purchase discount; one temporary table item/LR |Removed; Tinker's Magic remains separate |
| New spells |None from background |2 cantrips +1 level-1 choice; free1/day casting of that spell; materials still apply |
| Stats |Base8/14/14/15/10/10; BG+2INT/+1DEX |Base8/15/13/15/10/10; BG+2INT/+1CON |
| Final derived baseline |8/16/14/22/10/10;95 HP;DC 19;attack11;initiative8 |Same, before conditional item effects |
| Equipment/history |Approved actual inventory |Retained; no retroactive sale/purchase/refund or double starting package |

Sage reconstruction costs27points (0+9+5+9+2+2). Class choices add INT3/DEX1; Indomitable addsINT2. No old Artisan stat bonuses/feat retained alongside Sage. Crafting still works through Arcana and appropriate tools; Manifold supplies artisan forms/proficiency while used. Alchemist/Herbalism and Tinker are unaffected. Human, classes, subclass levels, slots, chosen existing spells, War Caster, Skill Expert and Alert stay.

Magic Initiate Mage Armor selected: existing entry gains a free level1 daily casting source; no duplicate book entry. Normal materials/duration still apply. Mind Sliver/Shocking Grasp selected; assigned to Wizard class selections, with existing Mage Hand/Prestidigitation now supplied by Magic Initiate(Wizard, INT). Ten selected cantrips total, Cantrips book10/16. Wizard5choices: Fire Bolt, Ray of Frost, Minor Illusion, Mind Sliver, Shocking Grasp. Artificer2choices Message/True Strike plus Mending grant. If a different new level1 spell is chosen, it also needs a book space; Combat is full but Workshop has room. No slot multiplication or free additional casts of other spells.

## Three distinct ways to gain tool proficiency

**Investigation example verified2026-10-17:** attuned Manifold in Mason form can provide the tool proficiency when actually using it to examine stonework. If DM calls INT(Investigation) and rules the masonry tools also apply, Carol uses her skill Expertise total+16 with Advantage. No extra+5 or second Expertise added. A plain Mason tool check, such as its listed STR chiseling action, instead uses the relevant ability/PB (normallySTR+4); Investigation Expertise is not automatically every tool check. Item-granted proficiency serves the same tool condition as native proficiency, while used. [2024 combined skill/tool rule](https://www.dndbeyond.com/sources/dnd/br-2024/equipment#ToolProficiency).

| Source | Scope | Casting bonus / limits |
|---|---|---|
| Native proficiency grant |Specific named tools from background, feat or class; usable with appropriate ordinary equipment |Adds PB once; independent of magic item. Not a subclass by itself. No spell attack/DC boost. |
| Manifold Tool (Forge2025) |Magic-action transformation into an artisan-tool set; proficiency while used; requires attunement |No spell attack/DC bonus or borrowed cantrip. Does not supply an entire workshop. |
| All-Purpose Tool+1 (Tasha) |Separate older item, not another name for Manifold. Artisan transformation/proficiency; requires Artificer attunement |Held: +1 Artificer spell attacks/DC only; can borrow an unknown cantrip for8h once/dawn. Not currently owned. |

Neither item includes Herbalism/Thieves' Tools merely through artisan transformation. Native+item proficiency does not become Expertise or double PB. Manifold grants real usable proficiency, so independent artisan proficiencies have reduced marginal value, but stay useful when item unavailable/unattuned or using separate ordinary equipment. Owning tools alone is not proficiency.

Sources: [Sage/Human 2024](https://www.dndbeyond.com/sources/dnd/br-2024/character-origins), [Wizard/Scholar/Evoker2024](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes#Wizard), [Magic Initiate2024](https://www.dndbeyond.com/sources/dnd/br-2024/feats#MagicInitiate), [Artisan](https://roll20.net/compendium/dnd5e/Backgrounds%3AArtisan?expansion=32231&iframe=true), [Crafter](https://roll20.net/compendium/dnd5e/Feats%3ACrafter?expansion=32231&iframe=true), [Manifold transcription](https://dnd2024.wikidot.com/magic-item:manifold-tool), [All-Purpose Tool transcription](https://dnd5e.wikidot.com/wondrous-items:all-purpose-tool). Artificer multiclass details remain secondary final-book-transcribed, as in existing source notes.
