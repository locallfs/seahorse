const { Client } = require('pg');
const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

// Representative products, one per class, chosen from the live catalogue.
// Woody refines from here; these are the test set.
const WANT = [
  { match: 'Gem Tang',                     shipping_class: 'fish_large',  livestock_type: 'fish'  },
  { match: 'Black Snowflake Clownfish',    shipping_class: 'fish_small',  livestock_type: 'fish'  },
  { match: 'Scopas Tang',                  shipping_class: 'fish_medium', livestock_type: 'fish'  },
  { match: 'Jawbreaker Mushroom',          shipping_class: 'coral_frag',  livestock_type: 'coral' },
  { match: 'Court Jester Galaxea',         shipping_class: 'coral_small', livestock_type: 'coral' },
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  if (!APPLY && !REVERT) await c.query('SET default_transaction_read_only = on');

  for (const w of WANT) {
    const r = await c.query(
      `SELECT id, title, metadata FROM product
       WHERE deleted_at IS NULL AND title ILIKE '%'||$1||'%' ORDER BY length(title) LIMIT 1`, [w.match]);
    if (!r.rowCount) { console.log(`  (no match) ${w.match}`); continue; }
    const p = r.rows[0];
    const current = p.metadata || {};

    if (REVERT) {
      const next = { ...current };
      delete next.shipping_type; delete next.livestock_type; delete next.shipping_class;
      await c.query(`UPDATE product SET metadata=$2, updated_at=now() WHERE id=$1`, [p.id, JSON.stringify(next)]);
      console.log(`  reverted  ${p.title.trim()}`);
      continue;
    }

    const next = { ...current, shipping_type: 'livestock', livestock_type: w.livestock_type, shipping_class: w.shipping_class };
    if (APPLY) {
      await c.query(`UPDATE product SET metadata=$2, updated_at=now() WHERE id=$1`, [p.id, JSON.stringify(next)]);
      console.log(`  tagged    ${w.shipping_class.padEnd(12)} ${p.title.trim()}  (${p.id})`);
    } else {
      console.log(`  would tag ${w.shipping_class.padEnd(12)} ${p.title.trim()}  (${p.id})`);
    }
  }

  const n = await c.query(`SELECT count(*)::int n FROM product
    WHERE deleted_at IS NULL AND metadata->>'shipping_type' = 'livestock'`);
  console.log('\nproducts now tagged as livestock:', n.rows[0].n);
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
