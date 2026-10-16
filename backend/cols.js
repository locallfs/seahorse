const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='product' AND column_name IN ('weight','length','width','height')`);
  r.rows.forEach(x => console.log(`  ${x.column_name}: ${x.data_type}`));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
