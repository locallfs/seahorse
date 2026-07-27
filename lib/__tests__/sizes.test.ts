import { describe, it, expect } from "vitest";
import {
  FISH_SIZES,
  CORAL_SIZES,
  SUPPLY_STANDARD_SIZES,
  compareSizes,
  sortVariantsBySize,
  getSizeSystem,
  getStartingPrice,
  visibleVariants,
  isVariantUnavailable,
  allVariantsUnavailable,
  normalizeSizeValue,
} from "@/lib/sizes";

const v = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  ...extra,
});

describe("fish sizes", () => {
  it("is the exact fixed list in the exact required order", () => {
    expect([...FISH_SIZES]).toEqual([
      "Tiny",
      "Small",
      "Small–Medium",
      "Medium",
      "Medium–Large",
      "Large",
      "Show",
    ]);
  });

  it("sorts by list order, not alphabetically", () => {
    const shuffled = ["Show", "Medium", "Tiny", "Medium–Large", "Small"].map(
      (t) => v(t),
    );
    expect(
      sortVariantsBySize(shuffled, "fish").map((x) => x.title),
    ).toEqual(["Tiny", "Small", "Medium", "Medium–Large", "Show"]);
  });

  it("unknown fish sizes sink below the fixed list", () => {
    const out = sortVariantsBySize(
      [v("Jumbo"), v("Tiny"), v("Show")],
      "fish",
    ).map((x) => x.title);
    expect(out).toEqual(["Tiny", "Show", "Jumbo"]);
  });
});

describe("coral sizes", () => {
  it("is the half-inch ladder through 6\" with Colony last", () => {
    expect([...CORAL_SIZES]).toEqual([
      "½\"",
      "1\"",
      "1½\"",
      "2\"",
      "2½\"",
      "3\"",
      "3½\"",
      "4\"",
      "4½\"",
      "5\"",
      "5½\"",
      "6\"",
      "Colony",
    ]);
    expect(CORAL_SIZES[CORAL_SIZES.length - 1]).toBe("Colony");
  });

  it("orders numerically with Colony after every inch size", () => {
    const shuffled = ["Colony", "2\"", "½\"", "5½\"", "1½\"", "6\""].map((t) =>
      v(t),
    );
    expect(
      sortVariantsBySize(shuffled, "coral").map((x) => x.title),
    ).toEqual(["½\"", "1½\"", "2\"", "5½\"", "6\"", "Colony"]);
  });
});

describe("supply sizes", () => {
  it("standard sizes keep Small → Medium → Large order (never alphabetical)", () => {
    const out = sortVariantsBySize(
      [v("Large"), v("Small"), v("Medium")],
      "supply",
    ).map((x) => x.title);
    expect(out).toEqual(["Small", "Medium", "Large"]);
    expect([...SUPPLY_STANDARD_SIZES]).toEqual(["Small", "Medium", "Large"]);
  });

  it("custom numeric sizes sort naturally: 2 oz before 10 oz, 100 ml before 500 ml", () => {
    const out = sortVariantsBySize(
      [v("10 oz"), v("2 oz"), v("500 ml"), v("100 ml")],
      "supply",
    ).map((x) => x.title);
    expect(out.indexOf("2 oz")).toBeLessThan(out.indexOf("10 oz"));
    expect(out.indexOf("100 ml")).toBeLessThan(out.indexOf("500 ml"));
  });

  it("staff order (metadata.size_order) wins over everything", () => {
    const out = sortVariantsBySize(
      [v("1 lb"), v("25 count"), v("36\"")],
      "supply",
      ["36\"", "1 lb", "25 count"],
    ).map((x) => x.title);
    expect(out).toEqual(["36\"", "1 lb", "25 count"]);
  });

  it("standard sizes rank before custom ones without a staff order", () => {
    const out = sortVariantsBySize(
      [v("100 ml"), v("Large"), v("Small")],
      "supply",
    ).map((x) => x.title);
    expect(out).toEqual(["Small", "Large", "100 ml"]);
  });
});

describe("size system + normalization", () => {
  it("reads only valid systems from metadata", () => {
    expect(getSizeSystem({ size_system: "fish" })).toBe("fish");
    expect(getSizeSystem({ size_system: "coral" })).toBe("coral");
    expect(getSizeSystem({ size_system: "supply" })).toBe("supply");
    expect(getSizeSystem({ size_system: "weird" })).toBeNull();
    expect(getSizeSystem(null)).toBeNull();
  });

  it("products without a size system keep their variant order untouched", () => {
    const variants = [v("B"), v("A")];
    expect(sortVariantsBySize(variants, null)).toEqual(variants);
  });

  it("normalizes whitespace for duplicate detection", () => {
    expect(normalizeSizeValue("  100   ml ")).toBe("100 ml");
  });

  it("compareSizes matches sizes case-insensitively against the fixed lists", () => {
    expect(compareSizes("fish", "medium", "Large")).toBeLessThan(0);
  });
});

describe("starting price (From $X)", () => {
  const priced = (title: string, amount: number, extra = {}) =>
    v(title, {
      calculated_price: { calculated_amount: amount, currency_code: "usd" },
      ...extra,
    });

  it("returns the lowest price flagged isFrom when sizes differ in price", () => {
    const p = getStartingPrice([
      priced("Small", 39.99),
      priced("Medium", 59.99),
    ]);
    expect(p).toEqual({ amount: 39.99, currency: "usd", isFrom: true });
  });

  it("is not a From price when every size costs the same", () => {
    const p = getStartingPrice([priced("Small", 25), priced("Large", 25)]);
    expect(p).toEqual({ amount: 25, currency: "usd", isFrom: false });
  });

  it("ignores staff-disabled sizes", () => {
    const p = getStartingPrice([
      priced("Small", 10, { metadata: { size_disabled: true } }),
      priced("Medium", 20),
    ]);
    expect(p).toEqual({ amount: 20, currency: "usd", isFrom: false });
  });

  it("returns null with no priced variants", () => {
    expect(getStartingPrice([])).toBeNull();
    expect(getStartingPrice([v("Small")])).toBeNull();
  });
});

describe("availability", () => {
  const stocked = (qty: number) =>
    v("x", {
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: qty,
    });

  it("a tracked, non-backorder size with 0 stock is unavailable", () => {
    expect(isVariantUnavailable(stocked(0))).toBe(true);
    expect(isVariantUnavailable(stocked(3))).toBe(false);
  });

  it("untracked or backorderable sizes stay available", () => {
    expect(isVariantUnavailable(v("x", { manage_inventory: false }))).toBe(false);
    expect(
      isVariantUnavailable(
        v("x", {
          manage_inventory: true,
          allow_backorder: true,
          inventory_quantity: 0,
        }),
      ),
    ).toBe(false);
  });

  it("whole product is out of stock only when EVERY enabled size is", () => {
    expect(allVariantsUnavailable([stocked(0), stocked(0)])).toBe(true);
    expect(allVariantsUnavailable([stocked(0), stocked(2)])).toBe(false);
  });

  it("staff-disabled sizes don't count toward product availability", () => {
    const disabledInStock = v("x", {
      metadata: { size_disabled: true },
      manage_inventory: true,
      allow_backorder: false,
      inventory_quantity: 5,
    });
    expect(allVariantsUnavailable([disabledInStock, stocked(0)])).toBe(true);
    expect(visibleVariants([disabledInStock, stocked(0)])).toHaveLength(1);
  });
});
