const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const snapshots = JSON.parse(fs.readFileSync('Documentation/Troubleshooting/Evidence/remote-snapshots.json','utf8'));
const read = p => (snapshots[p] ?? fs.readFileSync(p,'utf8')).replace(/^\uFEFF/,'');
const context = vm.createContext({console, crypto:require('crypto').webcrypto, URL, localStorage:{getItem:()=>null}, globalThis:null});
context.globalThis=context;
const manifest=JSON.parse(read('data/viewer/manifest.json'));
const problems=[];
for(const p of manifest.scripts) vm.runInContext(read(p),context,{filename:p});
const seeded={};
for(const [key,entries] of Object.entries(JSON.parse(read('library/manifest.json')).collections)) {
 seeded[key]={entries:entries.map(e=>{try{return JSON.parse(read(e.path));}catch(err){problems.push({path:e.path,error:err.message});return null;}}).filter(Boolean)};
}
context.seeded=seeded;
vm.runInContext('Library.seedCollections(seeded)',context);
const report={libraryProblems:problems,characters:[],repros:{},syntax:[]};
for(const f of fs.readdirSync('library/characters')) {
 const p='library/characters/'+f; const c=JSON.parse(read(p));context.character=c;
 const result=vm.runInContext(`(() => {
 const c=Library.resolveCharacterSync(character);
 const missing=[];
 for(const key of ['spells','inventory','abilities','customResources']) for(const e of c[key]||[]) if(e.tags?.includes('missing-library-ref')) missing.push({section:key,ref:e.libraryRef});
 for(const e of c.dnd?.feats||[]) if(e.tags?.includes('missing-library-ref')) missing.push({section:'feats',ref:e.libraryRef});
 let renderError=null,html='';try{html=ViewCharacter.buildHTML(character)}catch(e){renderError=e.stack}
 return {name:c.identity?.name,id:c.id,path:c.meta?.repoPath,level:c.dnd?.level,class:c.dnd?.class,multiclass:c.dnd?.multiclass,storedHp:c.dnd?.hp,effectiveHp:DndCalculations.getActiveHp(c),storedSlots:c.spellSlots,effectiveSlots:DndCalculations.resolveSpellSlots(c).slots,spellCount:c.spells.length,inventoryCount:c.inventory.length,abilityCount:c.abilities.length,missing,renderError,htmlLength:html.length, tabs:[...html.matchAll(/data-ovh-tab="([^"]+)"/g)].map(m=>m[1]), proficiency:c.dnd?.proficiencyBonus,stats:c.dnd?.stats,notes:c.notes};
 })()`,context);
 report.characters.push(result);
 const safeJson=x=>JSON.stringify(x).replace(/</g,'\\u003c');
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${manifest.styles.map(p=>`<link rel="stylesheet" href="../../../${p}">`).join('')}</head><body><main id="sheet-content"></main>${manifest.scripts.map(p=>`<script src="../../../${p}"></script>`).join('')}<script>Library.seedCollections(${safeJson(seeded)});const auditCharacter=${safeJson(c)};SurfacePresets.setActivePreset('character_card');ViewCharacter.mount(document.getElementById('sheet-content'),auditCharacter);</script></body></html>`;
 fs.writeFileSync('Documentation/Troubleshooting/Evidence/'+f.replace('.json','.html'),html);
 const em=JSON.parse(read('data/editor/manifest.json'));
 const editorHtml=`<!doctype html><html><head><meta charset="utf-8">${em.styles.map(p=>`<link rel="stylesheet" href="../../../${p}">`).join('')}</head><body><button id="audit-harvest">Audit form round trip (no save)</button><pre id="audit-output"></pre><main id="editor"></main>${em.scripts.map(p=>`<script src="../../../${p}"></script>`).join('')}<script>Library.seedCollections(${safeJson(seeded)});const auditCharacter=Schema.applyDefaults(${safeJson(c)});SurfacePresets.setActivePreset('editor');const auditEditor=Editor.mount(document.getElementById('editor'),auditCharacter);document.getElementById('audit-harvest').onclick=()=>{const after=auditEditor.getCurrentCharacter();document.getElementById('audit-output').textContent=JSON.stringify({spells:after.spells.slice(0,2),hp:after.dnd.hp,slots:after.spellSlots,abilities:after.abilities.slice(0,1)},null,2)};</script></body></html>`;
 fs.writeFileSync('Documentation/Troubleshooting/Evidence/editor-'+f.replace('.json','.html'),editorHtml);
}
report.repros=vm.runInContext(`({slotOverride:DndCalculations.resolveSpellSlots({dnd:{class:'Wizard',level:5},spellSlotMode:'override',spellSlotOverrides:{1:1},spellSlots:{1:{max:4,current:3}}}),ranger3:DndCalculations.calculateSpellSlots({dnd:{class:'Ranger',level:3}}),hpMissingMode:DndCalculations.resolveTamedHp({dnd:{class:'Fighter',level:5,stats:{con:{score:14}},hp:{max:100,current:100}}})})`,context);
for(const p of cp.execFileSync('rg',['--files','data','tools'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>p.endsWith('.js'))) {
 try{new vm.Script(fs.readFileSync(p,'utf8'),{filename:p})}catch(e){report.syntax.push({path:p,error:e.message})}
}
fs.writeFileSync('Documentation/Troubleshooting/Evidence/results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({libraryProblems:report.libraryProblems,characters:report.characters.map(c=>({...c,effectiveHp:{current:c.effectiveHp.current,max:c.effectiveHp.max,mode:c.effectiveHp.mode},stats:undefined,notes:undefined,effectiveSlots:c.effectiveSlots})),syntaxErrors:report.syntax,repros:report.repros},null,2));
async function simulateSave() {
 context.GitHub={};
 context.currentManifest=JSON.parse(read('library/manifest.json'));
 const result=await vm.runInContext(`(async()=>{
 const writes=[];
 GitHub.readLibraryFile=async()=>({data:currentManifest,sha:'mock'});
 GitHub.writeLibraryFile=async()=>({sha:'mock'});
 GitHub.readJsonFile=async(p,fallback)=>({data:fallback,sha:null});
 GitHub.writeJsonFile=async(p,data)=>{writes.push({path:p,data:JSON.parse(JSON.stringify(data))});return {sha:'mock'}};
 const c={identity:{name:'Audit Character',race:'Human'},dnd:{class:'Wizard',level:5,feats:[]},spells:[{id:'audit-spell',source:'inline',name:'Audit Spell',level:3,school:'Evocation',castingTime:'1 action',range:'150 ft',duration:'Instantaneous',description:'Deal 8d6 fire damage.',prepared:true,access:{label:'Future'},addons:{damage:{dice:'8d6'}}}],inventory:[],abilities:[],customResources:[]};
 const beforeClass=Library.find('classes','classes.wizard');
 await Library.syncCharacter(c);
 const resolved=Library.resolveCharacterSync(c);
 return {character:c,spellAfterSave:resolved.spells[0],classBefore:beforeClass,classAfter:Library.find('classes','classes.wizard'),spellWritten:writes.find(w=>w.data.name==='Audit Spell'),writeCount:writes.length};
 })()`,context);
 report.saveSimulation=result;fs.writeFileSync('Documentation/Troubleshooting/Evidence/results.json',JSON.stringify(report,null,2));
 console.log('SAVE SIMULATION '+JSON.stringify(result,null,2));
}
simulateSave().catch(e=>{console.error(e);process.exitCode=1;});
