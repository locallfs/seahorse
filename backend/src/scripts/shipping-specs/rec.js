// Appends spec records to dry-specs.json. Reads a JSON array on stdin.
const fs = require('fs'); const path = require('path');
const P = (f) => path.join(__dirname, f);
let raw = ''; process.stdin.on('data', d => raw += d).on('end', () => {
  const incoming = JSON.parse(raw);
  const specs = JSON.parse(fs.readFileSync(P('dry-specs.json'), 'utf8'));
  const byCode = new Map(specs.map(s => [s.code, s]));
  for (const r of incoming) byCode.set(r.code, r);
  const out = [...byCode.values()];
  fs.writeFileSync(P('dry-specs.json'), JSON.stringify(out, null, 2));
  const queue = JSON.parse(fs.readFileSync(P('dry-queue.json'), 'utf8'));
  console.log(`recorded ${incoming.length} | total ${out.length} / ${queue.length}`);
  const done = new Set(out.map(s => s.code));
  const next = queue.filter(q => !done.has(q.code)).slice(0, 10);
  console.log('\nnext up:');
  next.forEach(q => console.log(`  ${q.code}  ${q.title}`));
});
