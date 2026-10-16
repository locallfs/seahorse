# Dry goods shipping specs

Weight and box dimensions for all 364 products in the **supplies** category, so
shipping can be quoted from real numbers instead of a guess.

Units are **pounds** and **inches** — the units the Shippo provider already
declares (`mass_unit: "lb"`, `distance_unit: "in"` in
`src/modules/fulfillment-shippo/service.js`). The four Medusa columns
(`weight`, `length`, `width`, `height`) are `text`, so values are written as
plain numeric strings.

Where sources disagreed, the **higher** figure was taken: under-quoting a
shipment costs money, over-quoting only costs a sale.

## Running it

All scripts need the production connection string, so run them through Railway:

```bash
railway run -s Postgres node src/scripts/shipping-specs/apply-specs.js            # dry run
railway run -s Postgres node src/scripts/shipping-specs/apply-specs.js --apply    # write
railway run -s Postgres node src/scripts/shipping-specs/apply-specs.js --revert   # back to empty
railway run -s Postgres node src/scripts/shipping-specs/verify-specs.js           # read-only check
```

`--revert` is a clean undo: every one of these fields was NULL before this ran,
so reverting restores the exact previous state.

## Files

| File | What it is |
|---|---|
| `dry-specs.json` | The 254 products that have a barcode, keyed by barcode |
| `dry-specs-nocode.json` | The 110 with no barcode, keyed by product id |
| `dry-goods.json` | Snapshot of the catalogue this was built against |
| `dry-queue.json` / `dry-nocode.json` | Working split, ordered heaviest-impact first |
| `nocode-payload.json` | Input used to record the no-barcode half |
| `apply-specs.js` | Writes / reverts both spec files |
| `verify-specs.js` | Read-only completeness and sanity check |
| `dump-dry.js`, `order-dry.js`, `rec.js`, `rec2.js`, `left.js` | Gathering helpers |

## Known soft spots

These are the entries most worth a second look with a scale, because the number
came from the product name or a category norm rather than a published figure:

- **Not really shippable:** `Fresh Water`, `Saltwater` (priced per gallon),
  `Liverock per pound`, `Par Meter Rental`, `Plumbing Part`. They carry a
  sensible per-unit weight so they never quote as zero, but they are local-only
  in practice.
- **Sold per foot:** the five `ID - Hose - Food Grade` entries carry a
  per-foot weight, not a per-order weight.
- **PNW custom acrylic:** built in-house, so no public spec exists. Estimated
  from size class.

## Not covered

Fish, corals and inverts (843 products) were deliberately left untouched —
livestock ships in bags and insulated boxes, which is a different calculation.
