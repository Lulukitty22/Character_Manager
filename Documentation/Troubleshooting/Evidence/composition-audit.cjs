const fs=require('fs'),vm=require('vm');
const snapshots=JSON.parse(fs.readFileSync('Documentation/Troubleshooting/Evidence/remote-snapshots.json','utf8'));
const read=p=>(snapshots[p]??fs.readFileSync(p,'utf8')).replace(/^\uFEFF/,'');
const ctx=vm.createContext({console,crypto:require('crypto').webcrypto,URL,localStorage:{getItem:()=>null}});
ctx.globalThis=ctx;
const manifest=JSON.parse(read('data/viewer/manifest.json'));
for(const p of manifest.scripts)vm.runInContext(read(p),ctx,{filename:p});
ctx.seeded=Object.fromEntries(Object.entries(JSON.parse(read('library/manifest.json')).collections).map(([k,v])=>[k,{entries:v.map(e=>JSON.parse(read(e.path)))}]));
vm.runInContext('Library.seedCollections(seeded)',ctx);
const out={};
for(const name of ['carol-elfnein','capella-emerada-lugnica','seraphine']){
 ctx.input=JSON.parse(read('library/characters/'+name+'.json'));
 out[name]=vm.runInContext('Library.resolveCharacterSync(input)',ctx);
}
fs.writeFileSync('Documentation/Troubleshooting/Evidence/composition-resolved.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
