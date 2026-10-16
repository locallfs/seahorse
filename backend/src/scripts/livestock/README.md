# Livestock shipping — operational scripts

One-off scripts used to set up and smoke-test the livestock shipping option.
All of them read the production connection string, so run them through Railway
from `backend/`:

```bash
railway run -s Postgres node src/scripts/livestock/<script>.js [flags]
```

Every script is **dry-run by default**. Nothing writes without `--apply`.

| Script | What it does |
|---|---|
| `create-livestock-option.js` | Creates the `UPS Next Day Air - Live Arrival Guarantee` shipping option by cloning the proven `Overnight Shipping` wiring (same service zone, profile, provider and option type) and attaching the same two rules (`is_return=false`, `enabled_in_store=true`). `--revert` removes it and its rules. |
| `tag-livestock.js` | Sets `shipping_type` / `livestock_type` / `shipping_class` on representative products. `--revert` strips just those three keys and leaves the rest of the metadata alone. Edit the `WANT` list to tag more. |
| `e2e-livestock.js` | Read-only end-to-end check against the live store API: builds a cart from tagged livestock, sets a destination, adds the livestock shipping method, and prints the charged amount plus the persisted parcel plan. |

## Why the option is created by script rather than by hand

It is exactly what Medusa Admin would create — the script only guarantees the
`data` blob matches the fulfillment option the provider advertises, which is
what `calculatePrice` reads. Creating it in Admin works identically; see
`src/modules/fulfillment-shippo/LIVESTOCK.md` for the field-by-field values.

## Note on `e2e-livestock.js`

`GET /store/shipping-options` deliberately does **not** return calculated
prices — Medusa's store route uses `listShippingOptionsForCartWorkflow`, not the
`...WithPricing` variant. Calculated amounts only materialise when a shipping
method is added to the cart, which is why the script adds one. Don't read an
`amount` of `undefined` from the options list as a bug.

## Tagging the rest of the catalogue

`tag-livestock.js` tags a named test set. For the full catalogue, decide a
default class per category first — a medium fish and a coral frag are not
interchangeable, and a wrong class quietly misprices every order of that
species. Weigh a few real bags before committing to defaults; the checklist is
in `LIVESTOCK.md` section 7.
