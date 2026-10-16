// Records specs for dry goods that have NO barcode, matched on exact title.
const fs=require('fs'),path=require('path');const P=f=>path.join(__dirname,f);
let raw='';process.stdin.on('data',d=>raw+=d).on('end',()=>{
  const incoming=JSON.parse(raw);
  const nocode=JSON.parse(fs.readFileSync(P('dry-nocode.json'),'utf8'));
  const idByTitle=new Map(nocode.map(r=>[r.title.trim(),r.id]));
  const file=P('dry-specs-nocode.json');
  if(!fs.existsSync(file))fs.writeFileSync(file,'[]');
  const specs=JSON.parse(fs.readFileSync(file,'utf8'));
  const byId=new Map(specs.map(s=>[s.id,s]));
  const missed=[];
  for(const r of incoming){
    const id=idByTitle.get(r.title.trim());
    if(!id){missed.push(r.title);continue;}
    byId.set(id,{id,...r});
  }
  const out=[...byId.values()];
  fs.writeFileSync(file,JSON.stringify(out,null,2));
  console.log(`recorded ${incoming.length-missed.length} | total ${out.length} / ${nocode.length}`);
  if(missed.length){console.log('TITLE NOT MATCHED:');missed.forEach(t=>console.log('  '+JSON.stringify(t)));}
  const done=new Set(out.map(s=>s.id));
  const rest=nocode.filter(r=>!done.has(r.id));
  if(rest.length){console.log(`\nstill missing ${rest.length}:`);rest.slice(0,12).forEach(r=>console.log('  '+JSON.stringify(r.title)));}
});
