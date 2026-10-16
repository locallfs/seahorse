const fs = require('fs');
const path = require('path');
const dir = __dirname;
const P = (f) => path.join(dir, f);
const rows = JSON.parse(fs.readFileSync(P('dry-goods.json'), 'utf8'));
// Heavy/bulky first: those are where a wrong weight actually costs money.
const HEAVY = /salt|bucket|gallon|gal\b|kg\b|\blb\b|pound|liter|litre|reactor|skimmer|pump|light|led|tank|sump|sand|rock|rodi|ro\/di|filter|heater|chiller|doser|\bato\b|return/i;
const withCode = rows.filter(r => r.code);
const noCode = rows.filter(r => !r.code);
const score = (t) => (HEAVY.test(t) ? 0 : 1);
withCode.sort((a, b) => score(a.title) - score(b.title) || a.title.localeCompare(b.title));
fs.writeFileSync(P('dry-queue.json'), JSON.stringify(withCode, null, 2));
fs.writeFileSync(P('dry-nocode.json'), JSON.stringify(noCode, null, 2));
if (!fs.existsSync(P('dry-specs.json'))) fs.writeFileSync(P('dry-specs.json'), '[]');
console.log('queue (with barcode):', withCode.length, '| no barcode:', noCode.length);
console.log('high-impact count:', withCode.filter(r => score(r.title) === 0).length);
console.log('\nfirst 20 of queue:');
withCode.slice(0, 20).forEach((r, i) => console.log(`${String(i).padStart(3)}  ${r.code}  ${r.title}`));
