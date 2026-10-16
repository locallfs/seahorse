const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  const base = `FROM product p
    JOIN product_category_product pcp ON pcp.product_id = p.id
    JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.handle='supplies'
    WHERE p.deleted_at IS NULL`;
  const s = await c.query(`
    SELECT count(DISTINCT p.id)::int total,
      count(DISTINCT p.id) FILTER (WHERE p.weight IS NULL)::int missing_weight,
      count(DISTINCT p.id) FILTER (WHERE p.length IS NULL OR p.width IS NULL OR p.height IS NULL)::int missing_dims,
      count(DISTINCT p.id) FILTER (WHERE p.weight ~ '^[0-9.]+$' AND p.weight::numeric <= 0)::int zero_weight,
      count(DISTINCT p.id) FILTER (WHERE p.weight !~ '^[0-9.]+$')::int nonnumeric
    ${base}`);
  console.log('SUPPLIES:', s.rows[0]);
  const h = await c.query(`SELECT DISTINCT p.title, p.weight, p.length, p.width, p.height,
    p.weight::numeric AS wnum ${base} ORDER BY wnum DESC LIMIT 8`);
  console.log('\nheaviest:');
  h.rows.forEach(r => console.log(`  ${String(r.weight).padStart(6)} lb  ${r.length}x${r.width}x${r.height}  ${r.title.trim()}`));
  const l = await c.query(`SELECT DISTINCT p.title, p.weight, p.weight::numeric AS wnum ${base} ORDER BY wnum ASC LIMIT 5`);
  console.log('\nlightest:');
  l.rows.forEach(r => console.log(`  ${String(r.weight).padStart(6)} lb  ${r.title.trim()}`));
  const rest = await c.query(`SELECT count(*)::int n FROM product WHERE deleted_at IS NULL AND weight IS NULL`);
  console.log('\nproducts still with no weight (fish/coral/inverts, untouched):', rest.rows[0].n);
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
