// Writes gathered shipping specs onto products.
//   node apply-specs.js            -> dry run, prints what would change
//   node apply-specs.js --apply    -> performs the UPDATEs
//   node apply-specs.js --revert   -> sets the touched products back to NULL
// Weight is pounds, dimensions are inches: the units the Shippo provider
// already declares (mass_unit "lb", distance_unit "in"). Columns are text.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const P = (f) => path.join(__dirname, f);

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

(async () => {
  const specs = JSON.parse(fs.readFileSync(P('dry-specs.json'), 'utf8'));
  const goods = JSON.parse(fs.readFileSync(P('dry-goods.json'), 'utf8'));
  const idByCode = new Map(goods.filter(g => g.code).map(g => [g.code, g.id]));

  // Items with no barcode are recorded against the product id directly.
  const noCodeFile = P('dry-specs-nocode.json');
  const noCodeSpecs = fs.existsSync(noCodeFile)
    ? JSON.parse(fs.readFileSync(noCodeFile, 'utf8'))
    : [];

  const rows = [];
  const orphans = [];
  for (const s of specs) {
    const id = idByCode.get(s.code);
    if (!id) { orphans.push(s); continue; }
    rows.push({ id, ...s });
  }
  for (const s of noCodeSpecs) {
    if (!s.id) { orphans.push(s); continue; }
    rows.push(s);
  }

  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  if (!APPLY && !REVERT) await c.query('SET default_transaction_read_only = on');

  console.log(`${REVERT ? 'REVERT' : APPLY ? 'APPLY' : 'DRY RUN'}: ${rows.length} product(s)`);
  if (orphans.length) console.log(`  ${orphans.length} spec(s) had no matching product, skipped`);

  let changed = 0;
  for (const r of rows) {
    if (REVERT) {
      await c.query(
        `UPDATE product SET weight=NULL, length=NULL, width=NULL, height=NULL, updated_at=now()
         WHERE id=$1 AND deleted_at IS NULL`, [r.id]);
      changed++;
      continue;
    }
    if (APPLY) {
      const res = await c.query(
        `UPDATE product SET weight=$2, length=$3, width=$4, height=$5, updated_at=now()
         WHERE id=$1 AND deleted_at IS NULL`,
        [r.id, String(r.lb), String(r.l), String(r.w), String(r.h)]);
      changed += res.rowCount;
    } else {
      console.log(`  ${String(r.lb).padStart(6)} lb  ${String(r.l)}x${r.w}x${r.h} in   ${r.title}`);
    }
  }
  if (APPLY || REVERT) console.log(`rows written: ${changed}`);

  const after = await c.query(`
    SELECT count(*)::int total, count(weight)::int with_weight
    FROM product p
    JOIN product_category_product pcp ON pcp.product_id = p.id
    JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.handle='supplies'
    WHERE p.deleted_at IS NULL`);
  console.log('supplies with a weight now:', after.rows[0]);
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
