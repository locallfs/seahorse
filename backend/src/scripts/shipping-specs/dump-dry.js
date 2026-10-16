const { Client } = require('pg');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  const r = await c.query(`
    SELECT DISTINCT p.id, p.title, p.weight, p.length, p.width, p.height,
      (ARRAY_AGG(v.upc) FILTER (WHERE v.upc ~ '^[0-9]{8,14}$'))[1] AS upc,
      (ARRAY_AGG(v.barcode) FILTER (WHERE v.barcode ~ '^[0-9]{8,14}$'))[1] AS barcode,
      (ARRAY_AGG(v.ean) FILTER (WHERE v.ean ~ '^[0-9]{8,14}$'))[1] AS ean
    FROM product p
    JOIN product_category_product pcp ON pcp.product_id = p.id
    JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL
    LEFT JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
    WHERE p.deleted_at IS NULL AND pc.handle = 'supplies'
    GROUP BY p.id, p.title, p.weight, p.length, p.width, p.height
    ORDER BY p.title`);
  const rows = r.rows.map(x => ({
    id: x.id, title: x.title,
    code: x.upc || x.barcode || x.ean || null,
    weight: x.weight, length: x.length, width: x.width, height: x.height,
  }));
  fs.writeFileSync('dry-goods.json', JSON.stringify(rows, null, 2));
  console.log('dry goods:', rows.length, '| with code:', rows.filter(r => r.code).length,
              '| without:', rows.filter(r => !r.code).length);
  console.log('\nfirst 15 with codes:');
  rows.filter(r => r.code).slice(0, 15).forEach(r => console.log(`  ${r.code}  ${r.title}`));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
