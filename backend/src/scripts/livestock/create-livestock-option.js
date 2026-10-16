const { Client } = require('pg');
const crypto = require('crypto');

// Medusa-style id: prefix + 26 Crockford-ish base32 chars.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const mkId = (prefix) => prefix + '_' + Array.from(crypto.randomBytes(26))
  .map((b) => ALPHABET[b % ALPHABET.length]).join('');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');
const NAME = 'UPS Next Day Air - Live Arrival Guarantee';

const OPTION_DATA = {
  id: 'shippo-livestock-next-day',
  name: NAME,
  is_return: false,
  shipping_type: 'livestock',
  carrier: 'UPS',
  service_level_token: 'ups_next_day_air',
  live_arrival_guarantee: true,
  temperature_control: 'auto',
  weather_hold: true,
  hold_at_location: true,
  max_transit_days: 1,
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const cols = await c.query(`SELECT column_name, is_nullable, column_default FROM information_schema.columns
    WHERE table_name='shipping_option_rule' ORDER BY ordinal_position`);
  console.log('shipping_option_rule columns:',
    cols.rows.map(r => `${r.column_name}${r.is_nullable==='NO'&&!r.column_default?'*':''}`).join(', '));

  const existing = await c.query(`SELECT id FROM shipping_option WHERE name=$1 AND deleted_at IS NULL`, [NAME]);

  if (REVERT) {
    if (!existing.rowCount) { console.log('nothing to revert'); await c.end(); return; }
    const id = existing.rows[0].id;
    await c.query('BEGIN');
    await c.query(`DELETE FROM shipping_option_rule WHERE shipping_option_id=$1`, [id]);
    await c.query(`DELETE FROM shipping_option WHERE id=$1`, [id]);
    await c.query('COMMIT');
    console.log('REVERTED — removed option', id, 'and its rules');
    await c.end();
    return;
  }

  if (existing.rowCount) {
    console.log('already exists:', existing.rows[0].id, '— nothing to do');
    await c.end();
    return;
  }

  // Clone the proven Overnight option's wiring.
  const tmpl = await c.query(
    `SELECT service_zone_id, shipping_profile_id, provider_id, shipping_option_type_id
     FROM shipping_option WHERE name='Overnight Shipping' AND deleted_at IS NULL`);
  if (!tmpl.rowCount) throw new Error('template option "Overnight Shipping" not found');
  const t = tmpl.rows[0];

  const optionId = mkId('so');
  const plan = {
    id: optionId, name: NAME, price_type: 'calculated',
    service_zone_id: t.service_zone_id, shipping_profile_id: t.shipping_profile_id,
    provider_id: t.provider_id, shipping_option_type_id: t.shipping_option_type_id,
    data: OPTION_DATA,
    rules: [
      { attribute: 'is_return', operator: 'eq', value: 'false' },
      { attribute: 'enabled_in_store', operator: 'eq', value: 'true' },
    ],
  };

  if (!APPLY) {
    console.log('\nDRY RUN — would create:');
    console.log(JSON.stringify(plan, null, 2));
    await c.end();
    return;
  }

  await c.query('BEGIN');
  await c.query(
    `INSERT INTO shipping_option
       (id, name, price_type, service_zone_id, shipping_profile_id, provider_id,
        shipping_option_type_id, data, created_at, updated_at)
     VALUES ($1,$2,'calculated',$3,$4,$5,$6,$7,now(),now())`,
    [optionId, NAME, t.service_zone_id, t.shipping_profile_id, t.provider_id,
     t.shipping_option_type_id, JSON.stringify(OPTION_DATA)]);
  for (const r of plan.rules) {
    await c.query(
      `INSERT INTO shipping_option_rule
         (id, attribute, operator, value, shipping_option_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now())`,
      [mkId('sorul'), r.attribute, r.operator, JSON.stringify(r.value), optionId]);
  }
  await c.query('COMMIT');
  console.log('\nCREATED option', optionId, 'with', plan.rules.length, 'rules');

  const check = await c.query(
    `SELECT so.id, so.name, so.price_type, so.provider_id, so.data,
            (SELECT count(*) FROM shipping_option_rule r WHERE r.shipping_option_id=so.id) AS rules
     FROM shipping_option so WHERE so.id=$1`, [optionId]);
  console.log(JSON.stringify(check.rows[0], null, 2));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
