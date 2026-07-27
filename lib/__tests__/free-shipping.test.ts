import { describe, it, expect } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  isFreeShippingEligible,
  qualifiesForFreeShippingBadge,
} from "@/lib/freeShipping";

const fish = { categories: [{ handle: "fish" }] };
const coral = { categories: [{ handle: "corals" }] };
const supply = { categories: [{ handle: "supplies" }] };

describe("free-shipping eligibility", () => {
  it("threshold is $500", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(500);
  });

  it("live fish and coral categories are eligible", () => {
    expect(isFreeShippingEligible(fish)).toBe(true);
    expect(isFreeShippingEligible(coral)).toBe(true);
    expect(isFreeShippingEligible({ categories: [{ handle: "seahorses" }] })).toBe(true);
  });

  it("supplies are NEVER eligible", () => {
    expect(isFreeShippingEligible(supply)).toBe(false);
    expect(isFreeShippingEligible({ categories: [{ handle: "supplies" }], tags: [{ value: "Supplies" }] })).toBe(false);
  });

  it("fish/coral tags qualify products that lack categories", () => {
    expect(isFreeShippingEligible({ tags: [{ value: "Coral" }] })).toBe(true);
    expect(isFreeShippingEligible({ tags: [{ value: "WYSIWYG Fish" }] })).toBe(true);
    expect(isFreeShippingEligible({ tags: [{ value: "Test Kits" }] })).toBe(false);
  });

  it("NEVER derives eligibility from the product title", () => {
    expect(
      isFreeShippingEligible({ title: "Yellow Tang Fish Coral" } as never),
    ).toBe(false);
  });

  it("explicit metadata override wins in both directions", () => {
    expect(
      isFreeShippingEligible({ metadata: { free_shipping_eligible: true } }),
    ).toBe(true);
    expect(
      isFreeShippingEligible({
        metadata: { free_shipping_eligible: false },
        categories: [{ handle: "fish" }],
      }),
    ).toBe(false);
  });

  it("empty/unknown products are not eligible", () => {
    expect(isFreeShippingEligible(null)).toBe(false);
    expect(isFreeShippingEligible({})).toBe(false);
  });
});

describe("free-shipping badge rule", () => {
  it("badges eligible live products at the threshold and above", () => {
    expect(qualifiesForFreeShippingBadge(fish, 500)).toBe(true);
    expect(qualifiesForFreeShippingBadge(coral, 750)).toBe(true);
    expect(qualifiesForFreeShippingBadge(fish, 499.99)).toBe(false);
  });

  it("NEVER badges supplies, no matter the price", () => {
    expect(qualifiesForFreeShippingBadge(supply, 999)).toBe(false);
    expect(qualifiesForFreeShippingBadge(supply, 500)).toBe(false);
  });

  it("no price → no badge", () => {
    expect(qualifiesForFreeShippingBadge(fish, null)).toBe(false);
    expect(qualifiesForFreeShippingBadge(fish, undefined)).toBe(false);
  });
});
