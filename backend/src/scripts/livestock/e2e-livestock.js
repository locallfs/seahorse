const { Client } = require('pg');
const BASE = 'https://seahorse-production.up.railway.app';

const j = async (label, url, opts) => {
  const r = await fetch(url, opts);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!r.ok) throw new Error(`${label}: HTTP ${r.status} ${typeof body==='string'?body.slice(0,400):JSON.stringify(body).slice(0,400)}`);
  return body;
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  const key = (await c.query(`SELECT token FROM api_key WHERE type='publishable' AND revoked_at IS NULL AND deleted_at IS NULL LIMIT 1`)).rows[0].token;
  const region = (await c.query(`SELECT id, name FROM region WHERE deleted_at IS NULL LIMIT 1`)).rows[0];
  // Tagged livestock variants with their real on-hand stock.
  const picks = (await c.query(`
    SELECT p.title, p.metadata->>'shipping_class' AS cls, v.id AS variant_id, v.manage_inventory,
      COALESCE((SELECT sum(il.stocked_quantity - il.reserved_quantity)
                FROM product_variant_inventory_item pvii
                JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
                WHERE pvii.variant_id = v.id AND pvii.deleted_at IS NULL AND il.deleted_at IS NULL), 0) AS avail
    FROM product p JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
    WHERE p.deleted_at IS NULL AND p.metadata->>'shipping_type' = 'livestock' ORDER BY p.title`)).rows;
  await c.end();

  console.log('tagged livestock variants:');
  picks.forEach(p => console.log(`   ${p.cls.padEnd(12)} avail=${String(p.avail).padStart(3)} managed=${p.manage_inventory}  ${p.title.trim()}`));

  const H = { 'Content-Type': 'application/json', 'x-publishable-api-key': key };
  const ADDRESS = { first_name:'Test', last_name:'Livestock', address_1:'1600 Glenarm Pl',
    city:'Denver', province:'CO', postal_code:'80202', country_code:'us', phone:'5035551234' };

  const usable = (cls, qty) => {
    const p = picks.find(x => x.cls === cls && (!x.manage_inventory || Number(x.avail) >= qty));
    return p || null;
  };

  const scenarios = [
    { label: '1 coral frag  (expect 6x6x6, 1 parcel)', items: [['coral_frag', 1]] },
    { label: '1 medium fish + 1 frag  (expect 12x12x12)', items: [['fish_medium', 1], ['coral_frag', 1]] },
    { label: '1 large fish  (4 units -> 12x12x12)', items: [['fish_large', 1]] },
  ];

  for (const s of scenarios) {
    console.log(`\n=== ${s.label} ===`);
    const resolved = s.items.map(([cls, qty]) => [usable(cls, qty), qty]);
    if (resolved.some(([p]) => !p)) { console.log('  skipped — not enough stock on a tagged variant'); continue; }

    const { cart } = await j('create cart', `${BASE}/store/carts`, {
      method:'POST', headers:H, body: JSON.stringify({ region_id: region.id, email:'test@example.com' }) });
    for (const [p, qty] of resolved) {
      await j('add line', `${BASE}/store/carts/${cart.id}/line-items`, {
        method:'POST', headers:H, body: JSON.stringify({ variant_id: p.variant_id, quantity: qty }) });
    }
    await j('set address', `${BASE}/store/carts/${cart.id}`, {
      method:'POST', headers:H, body: JSON.stringify({ shipping_address: ADDRESS }) });

    const opts = await j('list options', `${BASE}/store/shipping-options?cart_id=${cart.id}`, { headers:H });
    const live = (opts.shipping_options||[]).find(o => /Live Arrival/i.test(o.name));
    if (!live) { console.log('  livestock option not offered'); continue; }

    // Adding the method is what triggers calculatePrice + validateFulfillmentData.
    let res;
    try {
      res = await j('add method', `${BASE}/store/carts/${cart.id}/shipping-methods`, {
        method:'POST', headers:H, body: JSON.stringify({ option_id: live.id }) });
    } catch (e) {
      console.log('  REJECTED:', e.message.replace(/^add method: HTTP \d+ /, '').slice(0, 300));
      continue;
    }
    const sm = (res.cart?.shipping_methods || [])[0];
    console.log(`  CHARGED: $${sm?.amount}   (${sm?.name})`);
    const d = sm?.data || {};
    console.log(`  carrier=${d.carrier} service=${d.service_level} thermal=${d.temperature_control} parcels=${d.parcel_count}`);
    console.log(`  ship date=${d.safe_ship_date} (${d.safe_ship_weekday}) weather_hold=${d.weather_hold}`);
    (d.parcels||[]).forEach((p,i) => console.log(`    parcel ${i+1}: ${p.box_id} ${p.length_in}x${p.width_in}x${p.height_in}in ${p.weight_oz}oz units=${p.pack_units} contents=${p.contents.length}`));
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
