import { describe, it, expect } from "vitest";
import {
  baseVariantPrice,
  isSizeDisabled,
  productPriceSummary,
  productStockSummary,
  variantLabel,
  variantStock,
} from "../product-view";

const priced = (amount: number, price_list_id: string | null = null) => ({
  amount,
  currency_code: "usd",
  price_list_id,
});

const stocked = (qty: number, reserved = 0) => ({
  inventory_items: [
    {
      inventory: {
        location_levels: [{ stocked_quantity: qty, reserved_quantity: reserved }],
      },
    },
  ],
});

describe("base price", () => {
  it("filters out sale-price-list rows so a sale price is never shown or written back as base", () => {
    const v = { prices: [priced(15, "plist_sale"), priced(20)] };
    expect(baseVariantPrice(v)).toEqual({ amount: 20, currency: "usd" });
  });

  it("prefers USD and returns null with no base rows", () => {
    expect(
      baseVariantPrice({ prices: [priced(9, "plist_sale")] }),
    ).toBeNull();
    expect(baseVariantPrice({ prices: [] })).toBeNull();
    expect(baseVariantPrice(null)).toBeNull();
  });
});

describe("product price summary (From $X)", () => {
  it("shows the lowest size price flagged From when sizes differ", () => {
    const s = productPriceSummary([
      { title: "Small", prices: [priced(40)] },
      { title: "Large", prices: [priced(90)] },
    ]);
    expect(s).toEqual({ amount: 40, currency: "usd", isFrom: true });
  });

  it("hidden sizes don't affect the shown price", () => {
    const s = productPriceSummary([
      { title: "Tiny", prices: [priced(5)], metadata: { size_disabled: true } },
      { title: "Medium", prices: [priced(60)] },
    ]);
    expect(s).toEqual({ amount: 60, currency: "usd", isFrom: false });
  });
});

describe("product stock summary", () => {
  it("sums available stock across ALL sizes (fixes the variants[0]-only list)", () => {
    const s = productStockSummary([
      { manage_inventory: true, ...stocked(0) },
      { manage_inventory: true, ...stocked(20, 2) },
    ]);
    expect(s.stock).toBe(18);
    expect(s.allUnlimited).toBe(false);
  });

  it("hidden sizes don't count toward stock", () => {
    const s = productStockSummary([
      { manage_inventory: true, metadata: { size_disabled: true }, ...stocked(50) },
      { manage_inventory: true, ...stocked(1) },
    ]);
    expect(s.stock).toBe(1);
  });

  it("unlimited only when NO size tracks inventory", () => {
    expect(
      productStockSummary([{ manage_inventory: false }]).allUnlimited,
    ).toBe(true);
    expect(
      productStockSummary([
        { manage_inventory: false },
        { manage_inventory: true, ...stocked(3) },
      ]).allUnlimited,
    ).toBe(false);
  });
});

describe("variant helpers", () => {
  it("stock subtracts reservations", () => {
    expect(variantStock({ ...stocked(10, 4) })).toBe(6);
  });

  it("labels sizes and marks staff-hidden ones", () => {
    expect(variantLabel({ title: "Medium–Large" })).toBe("Medium–Large");
    expect(variantLabel({ title: "" })).toBe("Default");
    expect(
      variantLabel({ title: "Show", metadata: { size_disabled: true } }),
    ).toBe("Show (hidden)");
    expect(isSizeDisabled({ metadata: { size_disabled: true } })).toBe(true);
    expect(isSizeDisabled({ metadata: {} })).toBe(false);
  });
});
