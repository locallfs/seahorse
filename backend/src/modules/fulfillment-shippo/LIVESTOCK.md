# Livestock shipping (UPS Next Day Air)

Dynamic, server-side livestock shipping built on top of the existing Shippo
fulfillment provider. Medusa decides what is being shipped, the backend builds
real parcels, Shippo returns a live UPS rate, and checkout shows that rate.

No flat rates. No Shippo token ever reaches the storefront.

## How it fits the existing provider

Everything is an extension of `service.js` — there is no second provider and no
second Shippo client.

| Piece | File |
|---|---|
| All tunable numbers | `livestock-config.js` (+ `.d.ts`) |
| Packing, rate selection, scheduling, fingerprinting | `livestock-packing.js` (+ `.d.ts`) |
| Live weather for `auto` thermal mode | `livestock-weather.js` |
| Provider wiring | `service.js` |
| Tests | `__tests__/livestock-packing.test.ts` |

Dry-goods shipping and the handling fees are untouched and still used. Free
shipping has been removed: shipping is always carrier rate + handling. The
$500 live perk is now "$50 off your next order", granted after checkout by
the next-order-credit subscriber, and it never alters a shipping quote.

### Why the config lives in `shipping_option.data`

Medusa 2.13 does **not** pass `shipping_option.metadata` into
`calculatePrice` — `listShippingOptionsForCartWithPricingWorkflow` only selects
`data`, and hands it over as `optionData`. So the livestock settings travel in
the fulfillment option, which Medusa stores as `shipping_option.data` when an
admin picks it. Nothing is hard-coded per option.

### Monetary units

`calculatePrice` returns **dollars**, matching the existing provider
(`parseFloat(rate.amount)` plus dollar handling fees). Shippo also returns
dollars, so no scaling happens anywhere. Do not add a `* 100`.

## 1. Medusa Admin setup

Settings → Locations & Shipping → your shipping profile → **Add shipping option**

| Field | Value |
|---|---|
| Name | `UPS Next Day Air - Live Arrival Guarantee` |
| Price type | **Calculated** |
| Provider | Shippo |
| Fulfillment option | **UPS Next Day Air - Live Arrival Guarantee** |
| Profile | same profile your other options use (Default) |
| Enabled in store | yes |

Picking that fulfillment option writes this into `shipping_option.data`
automatically — you do not type it:

```json
{
  "id": "shippo-livestock-next-day",
  "name": "UPS Next Day Air - Live Arrival Guarantee",
  "is_return": false,
  "shipping_type": "livestock",
  "carrier": "UPS",
  "service_level_token": "ups_next_day_air",
  "live_arrival_guarantee": true,
  "temperature_control": "auto",
  "weather_hold": true,
  "hold_at_location": true,
  "max_transit_days": 1
}
```

Nothing else to configure. Geographic service zones are unchanged — the option
lives in the existing **Nationwide** zone.

## 2. Product metadata

Set these on the **product** metadata, or on a **variant** when one size
differs. Variant values win over product values, field by field.

### Fish

```json
{
  "shipping_type": "livestock",
  "livestock_type": "fish",
  "shipping_class": "fish_medium"
}
```

Classes: `fish_small`, `fish_medium`, `fish_large`, `fish_xlarge`

### Coral

```json
{
  "shipping_type": "livestock",
  "livestock_type": "coral",
  "shipping_class": "coral_frag"
}
```

Classes: `coral_frag`, `coral_small`, `coral_medium`, `coral_large`

### Dry goods

```json
{ "shipping_type": "dry" }
```

Optionally let a small dry item ride along with livestock:

```json
{ "shipping_type": "dry", "can_ship_with_livestock": true }
```

### Per-item overrides

Any product or variant may override its class, and the override wins:

```json
{
  "shipping_type": "livestock",
  "livestock_type": "fish",
  "shipping_class": "fish_medium",
  "shipping_pack_units": 2.5,
  "shipping_packed_weight_oz": 56
}
```

### Worked examples

| | Metadata |
|---|---|
| Coral frag | `{"shipping_type":"livestock","livestock_type":"coral","shipping_class":"coral_frag"}` |
| Medium fish | `{"shipping_type":"livestock","livestock_type":"fish","shipping_class":"fish_medium"}` |
| Large fish | `{"shipping_type":"livestock","livestock_type":"fish","shipping_class":"fish_large"}` |
| Dry good | `{"shipping_type":"dry"}` |

A product with **no** `shipping_type` is treated as dry. Livestock has to be
opted into — that is what stops an unmarked product shipping as a weightless
animal.

## 3. What happens at checkout

1. Cart contains livestock → the livestock option appears.
2. Provider reads product/variant metadata (fetched directly; Medusa does not
   put metadata in the pricing context).
3. Each line expands to one packable item per unit of quantity.
4. First-fit-decreasing packs them into the smallest practical boxes.
5. Each parcel's weight is summed from its own real contents, plus box tare,
   thermal pack and buffer.
6. One Shippo shipment is created with **all** parcels.
7. The `ups_next_day_air` rate is located explicitly — never `rates[0]`, never
   a fallback to Ground or the Saver service.
8. That amount plus the $8 live handling fee is returned to Medusa.

If UPS Next Day Air is not offered for the address, the customer sees:

> UPS Next Day Air is not currently available for this shipping address. Please
> verify your address or contact us for assistance with livestock shipping.

If a livestock product is misconfigured, they see:

> We couldn't calculate shipping for one or more livestock items. Please
> contact us for assistance.

…and the server log names the offending product and variant id.

### Packing thresholds

| Pack units | Box |
|---|---|
| ≤ 2 | 6×6×6 |
| 2.5 – 8 | 12×12×12 |
| 8.5 – 18 | 18×14×14 |
| > 18 | multiple parcels, fewest boxes first, last box shrunk to fit |

### Rate deduplication

Quotes are cached against a fingerprint of cart id, destination postal
code/state/country, residential-vs-commercial, every parcel's dimensions and
weight, and the service level. Change any of those and it re-quotes. TTL is
`LIVESTOCK_RATE_CACHE_TTL_SECONDS` (default 120s). Uses the Redis cache module
when available, otherwise an in-process TTL map.

### Fulfillment consistency

`validateFulfillmentData` recomputes the shipment and returns the plan, which
Medusa persists as `shipping_method.data` and carries onto the order: box ids,
dimensions, per-parcel weight, the exact contents of each parcel, thermal mode,
safe ship date, weather-hold flag, and the Shippo rate/shipment id when present.
Fulfillment packs what checkout quoted.

No label is purchased during rate calculation. That stays a separate operation
in the fulfillment workflow.

## 4. Live weather (`temperature_control: "auto"`)

Two keyless public APIs, so there is no secret and no bill:

- `api.zippopotam.us` — postal code → latitude/longitude
- `api.open-meteo.com` — coordinates → daily min/max temperature (°F)

Both origin and destination are checked and the harsher reading wins. Verified
working against the live APIs.

| Low / high | Result |
|---|---|
| low ≤ 50 °F | heat pack |
| high ≥ 85 °F | cold pack |
| in between | no pack |
| low ≤ 25 °F or high ≥ 100 °F | weather **hold recommended** |

A weather lookup can never break checkout: disabled, timed out, unknown postal
code or non-US address all fall back to `LIVESTOCK_AUTO_THERMAL` (default
`none`) and log the reason.

Weather hold is recorded as a flag on the shipping method. The order stays
valid, totals are untouched, and fulfillment is what waits — it does not cancel
or re-price anything.

An explicit `none` / `heat` / `cold` on the shipping method data or the option
data always beats `auto`.

## 4b. Storefront: visitor weather on load

The site also checks the **visitor's own** location as soon as it loads, so a
customer sees shipping conditions for their area before they have typed
anything.

| Piece | File |
|---|---|
| One lookup per page load, shared app-wide | `components/ShippingConditionsContext.tsx` |
| The notice itself | `components/LiveShippingConditions.tsx` |
| Server-side resolver | `app/api/shipping-weather/route.ts` |
| Pure copy/threshold logic (tested) | `lib/shippingWeather.ts` |

`ShippingConditionsProvider` is mounted in `app/layout.tsx`, so the lookup
happens once on load rather than once per component. The notice then appears
inside the existing `ShippingNotice` on product and cart pages, and on the
checkout shipping step.

Location resolution, best first:

1. `?postal=` — the shipping address, once the customer has entered one
2. Vercel request geo headers (`x-vercel-ip-latitude` / `-longitude` /
   `-city` / `-postal-code`) — no permission prompt, no API key
3. the shop itself, so the notice is never blank in local dev

Once a postal code is known at checkout the notice switches to that
destination, because that is where the animals are actually going.

Customers are told whether a heat or cold pack is included, the current
temperature in their area, and the next live shipping day. They are never shown
pack units or animal weights.

Both the storefront route and the backend thermal decision share the same
thresholds, but they are two separate copies — `lib/shippingWeather.ts` only
drives what the visitor is *told*, while `livestock-config.js` decides what is
actually packed and charged. Retune them together.

## 5. Hold at UPS location

`hold_at_location` is recorded as **our preference**, nothing more. This
integration does not send a carrier Hold-at-Location instruction, because that
needs a UPS access-point address which the current Shippo setup does not
collect. The flag is there so ops can act on it; it does not silently promise
UPS anything.

## 6. Environment variables (all optional)

| Variable | Default | Effect |
|---|---|---|
| `LIVESTOCK_AUTO_THERMAL` | `none` | Fallback when the weather lookup can't answer |
| `LIVESTOCK_WEATHER_ENABLED` | `true` | `false` disables live lookups entirely |
| `LIVESTOCK_WEATHER_INCLUDE_ORIGIN` | `true` | `false` = judge on destination only |
| `LIVESTOCK_WEATHER_TIMEOUT_MS` | `2500` | Per-request timeout |
| `LIVESTOCK_WEATHER_CACHE_TTL_SECONDS` | `3600` | Forecast reuse |
| `LIVESTOCK_COLD_THRESHOLD_F` | `50` | Heat-pack trigger |
| `LIVESTOCK_HOT_THRESHOLD_F` | `85` | Cold-pack trigger |
| `LIVESTOCK_HARD_FREEZE_F` | `25` | Weather-hold trigger (cold) |
| `LIVESTOCK_EXTREME_HEAT_F` | `100` | Weather-hold trigger (heat) |
| `LIVESTOCK_RATE_CACHE_TTL_SECONDS` | `120` | Rate reuse |

> Note: with `includeOrigin` on, a 50 °F Portland morning puts a heat pack in
> every order. That is correct but aggressive; drop `LIVESTOCK_COLD_THRESHOLD_F`
> or turn origin off if it over-triggers.

## 7. Verify these against your actual packing bench

Every number below is an **estimate** and lives in `livestock-config.js`.
Weigh real bags on a real scale and correct them — that is the whole point of
keeping them in one file.

**Highest priority — these drive the rate most:**

1. `tareWeightOz` for all three boxes: weigh each **empty** box with its normal
   insulation (10 / 24 / 40 oz).
2. `packedWeightOz` for `fish_medium` (48 oz) and `coral_frag` (12 oz) — your
   two most common classes. Weigh a typical bagged animal, water included.
3. `maxPackUnits` per box (2 / 8 / 18): physically fill each box and count what
   actually fits safely.

**Then:**

4. `packedWeightOz` for the remaining classes, especially `fish_xlarge`
   (128 oz) and `fish_large` (80 oz).
5. `heatPackWeightOz` (4 oz) and `coldPackWeightOz` (16 oz) — weigh the packs
   you actually buy.
6. `shippingWeightBufferOz` (8 oz) — newspaper, bags, tape, rubber bands.
7. `packUnits` ratios: is a medium fish really worth four coral frags of space?
8. Box dimensions, if your boxes aren't exactly 6×6×6 / 12×12×12 / 18×14×14.

Change a number, run `npx vitest run`, redeploy. No code changes needed.

## 8. Example generated Shippo parcel payload

Cart: 2 medium fish + 3 coral frags, heat pack. 5.5 pack units → one 12×12×12.

```
2 x fish_medium  = 96 oz
3 x coral_frag   = 36 oz
box tare         = 24 oz
heat pack        =  4 oz
buffer           =  8 oz
-------------------------
total            = 168 oz
```

```json
{
  "address_from": {
    "name": "Woody's Seahorse Aquarium & Supply",
    "street1": "106 NE Russet St",
    "city": "Portland", "state": "OR", "zip": "97211", "country": "US"
  },
  "address_to": {
    "name": "Jane Customer", "street1": "500 Ocean Dr",
    "city": "Miami", "state": "FL", "zip": "33139", "country": "US"
  },
  "parcels": [
    {
      "length": "12",
      "width": "12",
      "height": "12",
      "distance_unit": "in",
      "weight": "168",
      "mass_unit": "oz"
    }
  ],
  "async": false
}
```

A 24-unit order produces two parcels in the same shipment — an 18×14×14 and a
12×12×12, each weighed from its own contents.

## 9. Tests

`npx vitest run` from `backend/`. The suite covers all ten required scenarios:
single frag, four frags, mixed 2.5 units, the 168 oz worked example, exactly 18
units, over 18 units splitting, mixed livestock/dry separation, an invalid
livestock product, picking `ups_next_day_air` out of four UPS services, and
refusing to substitute when it is absent. Plus safe-ship-date scheduling,
fingerprint invalidation and the weather decision table.

## 10. Deployment

No Dockerfile change needed. `medusa build` only emits TypeScript, so the
Dockerfile already copies this whole directory into the build output:

```
cp -r src/modules/fulfillment-shippo .medusa/server/src/modules/fulfillment-shippo
```

The new `.js` files are inside it and ship automatically.
