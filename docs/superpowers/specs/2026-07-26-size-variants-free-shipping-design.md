# Design — Structured Size Variants + Free-Shipping Eligibility

Date: 2026-07-26
Status: implementing (spec supplied in full by owner; treated as approved requirements)

## Goal

1. Fish, Coral, and Supply products get structured **size variants** on one shared
   product (one title, description, images, tags, categories, QuickBooks
   description) — never duplicate products per size.
2. Free shipping applies **only to live Fish and Coral**; Supplies never qualify,
   never count toward the threshold, and never show the badge.

## Architecture decisions

### Size model (both codebases)

- A product's size system lives in `product.metadata.size_system`:
  `"fish" | "coral" | "supply"`. Absent → no size variants (existing products
  unchanged).
- Sizes are Medusa **variants** on a single product option titled `Size`.
  Variant title = option value = human-readable label (`Medium–Large`, `2½"`,
  `500 ml`).
- Canonical ordered lists live in `lib/sizes.ts` (storefront) and
  `backend/src/lib/sizes.ts` (backend + admin UI). The two copies are pinned to
  the exact same lists by tests on each side.
  - Fish: Tiny, Small, Small–Medium, Medium, Medium–Large, Large, Show (en dash).
  - Coral: ½", 1", 1½", 2", 2½", 3", 3½", 4", 4½", 5", 5½", 6", Colony (Colony last).
  - Supply: standard Small, Medium, Large + free-text custom sizes
    (`100 ml`, `25 count`, `36"`, …).
- Ordering: fish/coral by canonical index (never alphabetical). Supply by the
  product's `metadata.size_order` array (staff-reorderable), falling back to
  standard S/M/L first then natural numeric compare (`2 oz` before `10 oz`).
- Staff-disabled sizes: `variant.metadata.size_disabled = true` — hidden from
  the storefront but the variant (and its QuickBooks mapping) is preserved.
- Out-of-stock sizes stay visible in the dropdown but disabled.

### Admin editor

- New widget `backend/src/admin/widgets/product-size-variants.tsx`
  (zone `product.details.after`): pick size system, enable sizes (fixed order
  for fish/coral, custom + reorder for supply), per-size price, sale price,
  SKU, UPC/barcode, stock.
- New backend route `GET/POST /admin/size-variants/:productId`:
  - GET returns current size state (system, sizes, per-variant fields).
  - POST validates (`backend/src/lib/size-variants.ts` pure planning core,
    unit-tested), then executes via core workflows so events fire and the
    QuickBooks auto-create subscriber sees new variants:
    `createProductOptionsWorkflow` / `updateProductOptionsWorkflow`,
    `createProductVariantsWorkflow`, `updateProductVariantsWorkflow`.
  - New variants without a SKU get one minted with the existing `lib/sku.ts`
    logic (collision-safe against every SKU in the DB).
  - Duplicate size values are rejected; SKU/UPC already used by another
    variant is rejected with a visible error (no guessing).
  - If a product has exactly one placeholder variant (`Default variant` /
    `Default`) with no Size option, the **first enabled size converts that
    variant in place** (title + option) so its SKU, inventory, and QuickBooks
    mapping survive. No orphan variant, no new QBO item.
  - Sale price: managed through one price list titled `Storefront Sales`
    (type sale, active), lazily created; per-variant sale prices upserted via
    `batchPriceListPricesWorkflow`. Storefront reads
    `calculated_price.original_amount` vs `calculated_amount`.
  - Stock is set from the widget through the existing battle-tested
    `/admin/variant-inventory/:variantId` route, one call per size.
- Because everything goes through core workflows + the same option/variant
  shape, products from Medusa admin, ReefNerds, CSV import, or QBO import share
  the same structure.

### QuickBooks

- Already per-variant (`quickbooks_item_map.variant_id` unique). No mapping
  changes. Item names already render `Product — Size` via `itemDisplayName`.
- New size variants created through the workflow emit
  `product.product-variant.created`, so the existing auto-create subscriber
  builds exactly one QBO item per new size (ledger → adopt-by-code → create →
  review; duplicates go to visible review — unchanged).
- Website description still never reaches QBO (`db-reads.ts` reads only
  `metadata.quickbooks_description`).
- Added regression tests pinning size-style item names and one-item-per-variant.

### Free shipping

- New storefront lib `lib/freeShipping.ts`:
  - `FREE_SHIPPING_THRESHOLD = 500`.
  - `isFreeShippingEligible(product)` — eligible only if
    `metadata.free_shipping_eligible` override, OR live Fish/Coral **category
    handle** (`fish`, `corals`, `coral`, `saltwater-fish`, `seahorses`), OR
    Fish/Coral **tag** (`Fish`, `Coral(s)`, `WYSIWYG Fish`, `WYSIWYG Corals`).
    Never from the product title.
- `ProductBadges` takes `freeShippingEligible` (default false → Supplies can
  never badge); badge = eligible && displayed price ≥ threshold.
- Listing cards (`ProductGrid`, `SearchResults`, `SideScrollGallery`) fetch
  categories/tags/metadata, compute eligibility, and show `From $X` when
  enabled sizes have different prices.
- Cart-level enforcement lives in the Shippo provider
  (`backend/src/modules/fulfillment-shippo`):
  - New pure decision core `free-shipping.js` (unit-tested):
    live-eligible subtotal = Σ(unit_price × qty) of Fish/Coral items only.
    - live subtotal < 500 → normal price (unchanged behavior).
    - live subtotal ≥ 500 and cart is live-only → shipping = $0.
    - live subtotal ≥ 500 mixed cart → shipping = carrier rate + supplies
      handling ($7) — i.e. the cart is charged as a supplies-only shipment;
      the live portion's handling is free, supplies stay chargeable.
  - Classification is by **product category / tags / explicit metadata via
    SQL** (same handles/tags as the storefront), resolved through the shared
    PG connection; if the connection or query is unavailable the provider
    falls back to full-price (fail safe: never gives free shipping by
    accident). Titles are never used for eligibility.
  - Overnight-only gating for live animals and existing handling fees are
    preserved.
- Marketing copy updated to match (header trust bar, shipping policy page,
  chatbot store-info): free shipping is for live fish & coral orders $500+.

### Storefront product page

- Multi-size products start with **no selection** (`Select size…`); price
  shows `From $min` until a size is picked; Add to Cart requires a selection.
- Sizes sort by the size system's canonical order; out-of-stock sizes are
  disabled with an `— Out of Stock` suffix; staff-disabled sizes don't render.
- `Out of Stock` banner only when every enabled size is unavailable.
- Sale display: strikethrough original price when
  `original_amount > calculated_amount`.
- Single-variant products keep today's behavior exactly.

### Migration safety

- No automatic conversion of existing products. A read-only report script
  (`backend/src/scripts/size-variant-report.ts`, run via `medusa exec`) lists:
  multi-variant products, probable duplicate size-specific listings (title
  heuristic — report only), safe single-variant products, and SKU/UPC/
  inventory/QBO-mapping conflicts.

## Testing

Vitest on both sides: canonical order tests (fish exact order; coral ½"→6" with
Colony last; supply standard + custom ordering), planning-core tests (dedupe,
convert-default, unknown size rejection, SKU minting), free-shipping decision
tests (supplies never count/qualify; mixed cart keeps supplies chargeable;
live-only ≥500 → free), badge eligibility tests, `From $X` helper tests,
QBO size-name mapping tests, plus updated storefront source-contract tests.
`npm run build` (storefront) and `medusa build` (backend) must pass.
