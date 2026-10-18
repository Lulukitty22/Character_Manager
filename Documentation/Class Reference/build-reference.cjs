/* Rebuild numeric reference tables. Documentation only; never writes library/. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const context = vm.createContext({ Schema: { getAbilityModifier: score => Math.floor((score - 10) / 2) } });
vm.runInContext(fs.readFileSync(path.join(root, 'data/common/scripts/dnd-calculations.js'), 'utf8') + ';globalThis.calc=DndCalculations;', context);
const slots = (wizard, artificer = 0, sorcerer = 0) => {
  const c = { dnd: { class: 'Wizard', level: wizard + artificer + sorcerer,
    multiclass: [{ class: 'Artificer', level: artificer }, { class: 'Sorcerer', level: sorcerer }] }, inventory: [] };
  return context.calc.calculateSpellSlots(c);
};
const slotText = result => Object.values(result.slots).map(s => s.max).join('/') || '—';
assert.equal(slotText(slots(9, 3)), '4/3/3/3/2/1');
assert.equal(slotText(slots(11, 3)), '4/3/3/3/2/1/1');
assert.equal(slotText(slots(9, 6)), '4/3/3/3/2/1');
assert.equal(slotText(slots(20)), '4/3/3/3/3/2/2/1/1');
const prof = level => level ? 2 + Math.floor((level - 1) / 4) : '—';
const fullTier = level => level ? Math.min(9, Math.ceil(level / 2)) : 0;
const artTier = level => level ? Math.min(5, Math.ceil(level / 4)) : 0;
const wizardPrepared = [0,4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25];
const sorcererPrepared = [0,2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
const wizardFeatures = {1:'Casting; rituals; recovery',2:'Scholar',3:'Subclass',4:'Feat',5:'Memorize Spell',6:'Subclass',8:'Feat',10:'Subclass',12:'Feat',14:'Subclass',16:'Feat',18:'Spell Mastery',19:'Epic Boon',20:'Signature Spells'};
const sorcererFeatures = {1:'Casting; Innate Sorcery',2:'Font; Metamagic',3:'Subclass',4:'Feat',5:'Restoration',6:'Subclass',7:'Sorcery Incarnate',8:'Feat',10:'More Metamagic',12:'Feat',14:'Subclass',16:'Feat',17:'More Metamagic',18:'Subclass',19:'Epic Boon',20:'Arcane Apotheosis'};
const artFeatures = {1:'Casting; Tinker’s Magic',2:'Replicate Magic Item',3:'Specialty',4:'Feat',5:'Specialty; tier2',6:'Magic Item Tinker',7:'Flash of Genius',8:'Feat',9:'Specialty; tier3',10:'Magic Item Adept',11:'Spell-Storing Item',12:'Feat',13:'Tier4',14:'Advanced Artifice',15:'Specialty',16:'Feat',17:'Tier5',18:'Magic Item Master',19:'Epic Boon',20:'Soul of Artifice'};
const dir = __dirname;
function replaceTable(filename, marker, table) {
  const file = path.join(dir, filename);
  const body = fs.readFileSync(file, 'utf8');
  assert(body.includes(marker), 'Missing table marker in ' + filename);
  const end = marker.replace(' -->', '_END -->');
  const startIndex = body.indexOf(marker), endIndex = body.indexOf(end, startIndex);
  const tail = endIndex < 0 ? startIndex + marker.length : endIndex + end.length;
  fs.writeFileSync(file, body.slice(0, startIndex) + marker + '\n' + table + '\n' + end + body.slice(tail), 'utf8');
}
let wizard = '| Level | Highest spell | Cantrips | Prepared* | New checkpoint |\n|---|---|---|---|---|\n';
let sorcerer = '| Level | Highest spell | Cantrips | Prepared* | Class points | New checkpoint |\n|---|---|---|---|---|---|\n';
let artificer = '| Level | Highest spell | New checkpoint |\n|---|---|---|\n';
let capacity = '| Class level | Pure-class PB | Wizard/Sorcerer slots (1→9) | Artificer slots (1→5) |\n|---|---|---|---|\n';
for (let level = 0; level <= 20; level++) {
  const wc = !level ? 0 : level >= 10 ? 5 : level >= 4 ? 4 : 3;
  const sc = !level ? 0 : level >= 10 ? 6 : level >= 4 ? 5 : 4;
  wizard += `| ${level} | ${fullTier(level)} | ${wc} | ${wizardPrepared[level]} | ${wizardFeatures[level] || (level ? 'Spell capacity grows; see slots' : 'No class features')} |\n`;
  sorcerer += `| ${level} | ${fullTier(level)} | ${sc} | ${sorcererPrepared[level]} | ${level >= 2 ? level : 0} | ${sorcererFeatures[level] || (level ? 'Spell capacity grows; see slots' : 'No class features')} |\n`;
  artificer += `| ${level} | ${artTier(level)} | ${artFeatures[level] || (level ? 'Capacity/progression; exact plan table pending' : 'No class features')} |\n`;
  capacity += `| ${level} | ${prof(level)} | ${slotText(slots(level))} | ${slotText(slots(0, level))} |\n`;
}
replaceTable('Wizard.md', '<!-- WIZARD_TABLE -->', wizard.trim());
replaceTable('Sorcerer.md', '<!-- SORCERER_TABLE -->', sorcerer.trim());
replaceTable('Artificer.md', '<!-- ARTIFICER_TABLE -->', artificer.trim());
replaceTable('Spell Slots.md', '<!-- SLOTS_TABLE -->', capacity.trim());
const builds = [[9,3,0],[8,4,0],[7,5,0],[6,6,0],[12,0,0],[0,12,0],[0,0,12],[11,3,0],[9,5,0],[8,6,0],[9,3,2],[9,6,0],[11,6,0],[17,3,0],[14,6,0],[11,9,0],[9,11,0],[20,0,0],[0,20,0],[0,0,20]];
let comparison = '| W/A/S | Total | PB | Effective caster | Slots (1→9) | Actual W/A/S spell tiers | Base INT DC / attack** | Aetherlock Spellround cap*** |\n|---|---|---|---|---|---|---|---|\n';
const data = [];
for (const [w,a,s] of builds) {
  const total = w+a+s, result = slots(w,a,s), p = prof(total);
  comparison += `| ${w}/${a}/${s} | ${total} | +${p} | ${result.casterLevel} | ${slotText(result)} | ${fullTier(w)}/${artTier(a)}/${fullTier(s)} | ${8+6+p} / +${6+p} | ${a ? Math.ceil(a/3) : 'Attunement unresolved'} |\n`;
  data.push({wizard:w,artificer:a,sorcerer:s,total,proficiency:p,effectiveCaster:result.casterLevel,slots:JSON.parse(JSON.stringify(result.slots)),spellTiers:{wizard:fullTier(w),artificer:artTier(a),sorcerer:fullTier(s)}});
}
replaceTable('Multiclass Tradeoffs.md', '<!-- COMPARISON_TABLE -->', comparison.trim());
fs.writeFileSync(path.join(dir, 'Comparison Data.json'), JSON.stringify({status:'documentation comparison, not approved character data',rules:'2024 Wizard/Sorcerer; 2025 Artificer feature milestones with final plan/prepared caps pending',builds:data}, null, 2)+'\n');
console.log('Generated 21-row progressions for all three classes, slot table and 20 candidate builds. Numeric breakpoint assertions passed.');
