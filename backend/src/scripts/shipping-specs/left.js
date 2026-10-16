const fs=require('fs'),path=require('path');const P=f=>path.join(__dirname,f);
const q=JSON.parse(fs.readFileSync(P('dry-queue.json'),'utf8'));
const d=new Set(JSON.parse(fs.readFileSync(P('dry-specs.json'),'utf8')).map(s=>s.code));
const rest=q.filter(x=>!d.has(x.code));
const n=Number(process.argv[2]||45);
console.log('REMAINING',rest.length);
rest.slice(0,n).forEach((x,i)=>console.log(String(i).padStart(3),x.code,x.title));
