const fs=require('fs'),vm=require('vm');
const remote=JSON.parse(fs.readFileSync('Documentation/Troubleshooting/Evidence/remote-snapshots.json','utf8'));
const read=p=>(remote[p]??fs.readFileSync(p,'utf8')).replace(/^\uFEFF/,'');
const ctx=vm.createContext({console,crypto:require('crypto').webcrypto,GitHub:{},URL,localStorage:{getItem:()=>null}});
for(const p of JSON.parse(read('data/viewer/manifest.json')).scripts)vm.runInContext(read(p),ctx);
const seeded={};const manifest=JSON.parse(read('library/manifest.json'));
for(const [key,entries]of Object.entries(manifest.collections))seeded[key]={entries:entries.map(e=>JSON.parse(read(e.path)))};
ctx.seeded=seeded;ctx.currentManifest=manifest;
vm.runInContext('Library.seedCollections(seeded)',ctx);
(async()=>{
const report=await vm.runInContext(`(async()=>{
 const writes=[],persisted=new Set();let fail=true;
 GitHub.readLibraryFile=async()=>({data:currentManifest,sha:'mock'});
 GitHub.writeLibraryFile=async()=>({sha:'mock'});
 GitHub.readJsonFile=async(p,f)=>({data:f,sha:null});
 GitHub.writeJsonFile=async(p,data)=>{if(fail&&data.name==='Second Spell')throw Error('Simulated network interruption');writes.push({path:p,name:data.name});persisted.add(data.id);return{sha:'mock'}};
 const c={identity:{name:'Audit'},spells:[{id:'first-spell',name:'First Spell',level:1},{id:'second-spell',name:'Second Spell',level:2}],inventory:[{id:'zero-item',name:'Zero Item',quantity:0,attuned:true,addons:{requiresAttunement:true}}],abilities:[],customResources:[]};
 let firstError='';try{await Library.syncCharacter(c)}catch(e){firstError=e.message}
 const convertedAfterFailure=JSON.parse(JSON.stringify(c));const firstWriteCount=writes.length;fail=false;
 await Library.syncCharacter(c);
 return{firstError,convertedAfterFailure,firstWriteCount,retryWrites:writes.slice(firstWriteCount),refsWithoutPersistedRecords:[...c.spells,...c.inventory].filter(e=>!persisted.has(e.libraryRef)).map(e=>e.libraryRef)};
})()`,ctx);
fs.writeFileSync('Documentation/Troubleshooting/Evidence/failure-repro.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
