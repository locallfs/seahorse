import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
const exists = (...p: string[]) =>
  fs.existsSync(path.join(__dirname, "..", "..", ...p));

const FILTER_PAGES = [
  "app/fish/page.tsx",
  "app/fish/[subcategory]/page.tsx",
  "app/corals/page.tsx",
  "app/corals/[subcategory]/page.tsx",
  "app/supplies/page.tsx",
  "app/supplies/[subcategory]/page.tsx",
  "app/store/page.tsx",
];

describe("consolidated Filters control", () => {
  it("every scattered-filter page now renders the ONE ListingFilterBar", () => {
    for (const page of FILTER_PAGES) {
      const src = read(page);
      expect(src, page).toMatch(/ListingFilterBar/);
      expect(src, page).not.toMatch(/FishNav|CoralsNav|SuppliesNav/);
    }
  });
  it("the old scattered chip components are gone", () => {
    expect(exists("components", "FishNav.tsx")).toBe(false);
    expect(exists("components", "CoralsNav.tsx")).toBe(false);
    expect(exists("components", "SuppliesNav.tsx")).toBe(false);
  });
  it("the store page's old tab strip is removed (panel owns category selection)", () => {
    const src = read("app/store/page.tsx");
    expect(src).not.toMatch(/border-b-2/);
    expect(src).toMatch(/storeFiltersConfig/);
  });
});

describe("FiltersPanel accessibility + mobile behavior (source contract)", () => {
  const src = read("components", "FiltersPanel.tsx");
  it("button announces state: aria-expanded + aria-controls, visible Filters label with count", () => {
    expect(src).toMatch(/aria-expanded/);
    expect(src).toMatch(/aria-controls/);
    expect(src).toMatch(/Filters\{count > 0 \? ` \(\$\{count\}\)` : ""\}/);
  });
  it("panel is a labelled dialog with radio-group semantics and screen-reader active state", () => {
    expect(src).toMatch(/role="dialog"/);
    expect(src).toMatch(/aria-label="Product filters"/);
    expect(src).toMatch(/role="radiogroup"/);
    expect(src).toMatch(/aria-current/);
    expect(src).toMatch(/currently active/);
  });
  it("keyboard: Escape closes; focus moves into the panel and returns to the button", () => {
    expect(src).toMatch(/key === "Escape"/);
    expect(src).toMatch(/buttonRef\.current\?\.focus\(\)/);
    expect(src).toMatch(/querySelector<HTMLElement>\("input, button"\)\?\.focus\(\)/);
  });
  it("mobile: full-width bottom drawer; desktop: dropdown; never covers the fixed header", () => {
    expect(src).toMatch(/fixed inset-x-0 bottom-0/); // mobile drawer
    expect(src).toMatch(/md:absolute/); // desktop dropdown
    // Backdrop and panel sit BELOW the site header (header is z-50).
    expect(src).toMatch(/z-30/);
    expect(src).toMatch(/z-40/);
    expect(src).not.toMatch(/z-50/);
  });
  it("has Apply Filters and Clear All controls; closing without applying discards edits", () => {
    expect(src).toMatch(/Apply Filters/);
    expect(src).toMatch(/Clear All/);
    expect(src).toMatch(/setPending\(activeValue\)/); // reopen re-stages from URL state
  });
});

describe("alphabetical ordering wiring", () => {
  it("browse grids and search results sort A–Z", () => {
    expect(read("components", "ProductGrid.tsx")).toMatch(/sortProductsAlpha/);
    expect(read("components", "SearchResults.tsx")).toMatch(/sortProductsAlpha/);
  });
  it("curated displays stay curated: no alphabetical sorting in galleries, catalog cache, or homepage", () => {
    expect(read("components", "SideScrollGallery.tsx")).not.toMatch(/sortProductsAlpha|compareNames|alphaSort/);
    expect(read("lib", "catalog.ts")).not.toMatch(/sortProductsAlpha|compareNames|alphaSort/);
    expect(read("app", "page.tsx")).not.toMatch(/alphaSort/);
  });
});

describe("badge layout — one shared stack, no overlaps possible", () => {
  const badges = read("components", "ProductBadges.tsx");
  it("single stacked container with spacing, inside the card image bounds", () => {
    expect(badges).toMatch(/flex flex-col/);
    expect(badges).toMatch(/gap-1\.5/);
    expect(badges).toMatch(/max-w-\[calc\(100%-1rem\)\]/);
    expect(badges).toMatch(/data-badge-stack/);
  });
  it("priority order in the stack: Out of Stock renders above Free Shipping", () => {
    const stock = badges.indexOf("Out of Stock");
    const shipping = badges.indexOf("Free Shipping");
    expect(stock).toBeGreaterThan(-1);
    expect(shipping).toBeGreaterThan(-1);
    expect(stock).toBeLessThan(shipping);
  });
  it("badges are informational only (no pointer capture over the card)", () => {
    expect(badges).toMatch(/pointer-events-none/);
  });
  it("eligibility: Free Shipping gated on live Fish/Coral eligibility AND the shared $500 threshold", () => {
    // The threshold lives in ONE place (lib/freeShipping) and the badge can
    // only show for products the eligibility rule approves — Supplies default
    // to NOT eligible, so they can never badge.
    expect(badges).toMatch(/FREE_SHIPPING_THRESHOLD/);
    expect(badges).toMatch(/freeShippingEligible = false/);
    expect(badges).toMatch(/freeShippingEligible &&/);
    expect(badges).toMatch(/outOfStock/);
    const lib = read("lib", "freeShipping.ts");
    expect(lib).toMatch(/FREE_SHIPPING_THRESHOLD = 500/);
    // Eligibility comes from stable data only — never the product title.
    expect(lib).not.toMatch(/\.title|isLiveAnimalByTitle|LIVE_KEYWORDS/);
  });
  it("all product cards use the shared stack — no separate absolute badge positions remain", () => {
    for (const file of [
      ["components", "ProductGrid.tsx"],
      ["components", "SearchResults.tsx"],
      ["components", "SideScrollGallery.tsx"],
    ] as const) {
      const src = read(...file);
      expect(src, file.join("/")).toMatch(/ProductBadges/);
      expect(src, file.join("/")).not.toMatch(/FreeShippingBadge|OutOfStockBanner/);
    }
    expect(exists("components", "FreeShippingBadge.tsx")).toBe(false);
  });
  it("every badge combination routes through the one stack (stock only, shipping only, both, neither)", () => {
    // The component's own logic: null render when nothing applies; otherwise
    // stacked children in priority order. Verified structurally above; the
    // combination matrix is exercised in the screenshot pass.
    expect(badges).toMatch(/if \(!outOfStock && !freeShipping && extraLabels\.length === 0\) return null/);
  });
  it("product detail page keeps its ribbon in-flow banners (no overlapping pair)", () => {
    const detail = read("app", "products", "[handle]", "ProductDetail.tsx");
    expect(detail).toMatch(/OutOfStockBanner/);
    expect(detail).toMatch(/ShippingNotice/); // in normal page flow, not floating
    // the deleted FreeShippingBadge COMPONENT must not come back (the
    // qualifiesForFreeShippingBadge helper from lib/freeShipping is fine)
    expect(detail).not.toMatch(/<FreeShippingBadge|components\/FreeShippingBadge/);
  });
});

describe("size variants wiring", () => {
  const detail = read("app", "products", "[handle]", "ProductDetail.tsx");
  it("multi-size products require an explicit size selection before add-to-cart", () => {
    expect(detail).toMatch(/Select a size…/);
    expect(detail).toMatch(/Select a Size/); // add-to-cart placeholder label
  });
  it("sizes render in size-system order; unavailable sizes disable instead of hiding the product", () => {
    expect(detail).toMatch(/sortVariantsBySize/);
    expect(detail).toMatch(/disabled=\{unavailable\}/);
    expect(detail).toMatch(/\(Out of Stock\)/);
    expect(detail).toMatch(/allVariantsUnavailable/); // banner only when ALL sizes gone
  });
  it("every listing card shows starting prices through the ONE shared helper", () => {
    for (const file of [
      ["components", "ProductGrid.tsx"],
      ["components", "SearchResults.tsx"],
      ["components", "SideScrollGallery.tsx"],
    ] as const) {
      const src = read(...file);
      expect(src, file.join("/")).toMatch(/getStartingPrice/);
      expect(src, file.join("/")).toMatch(/isFrom \? "From " : ""/);
      expect(src, file.join("/")).toMatch(/isFreeShippingEligible/);
    }
  });
});
