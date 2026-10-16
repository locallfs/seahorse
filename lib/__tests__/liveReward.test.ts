import { describe, it, expect } from "vitest";
import {
  LIVE_REWARD_AMOUNT,
  LIVE_REWARD_THRESHOLD,
  isLiveProduct,
  earnsLiveReward,
} from "@/lib/liveReward";

const fish = { categories: [{ handle: "fish" }] };
const coral = { categories: [{ handle: "corals" }] };
const supply = { categories: [{ handle: "supplies" }] };

describe("the live reward offer", () => {
  it("is $50 off the next order, over a $500 live threshold", () => {
    expect(LIVE_REWARD_AMOUNT).toBe(50);
    expect(LIVE_REWARD_THRESHOLD).toBe(500);
  });
});

describe("live eligibility", () => {
  it("live fish and coral categories are eligible", () => {
    expect(isLiveProduct(fish)).toBe(true);
    expect(isLiveProduct(coral)).toBe(true);
    expect(isLiveProduct({ categories: [{ handle: "seahorses" }] })).toBe(true);
  });

  it("supplies are never eligible", () => {
    expect(isLiveProduct(supply)).toBe(false);
  });

  it("Fish/Coral tags count too, case-insensitively", () => {
    expect(isLiveProduct({ tags: [{ value: "WYSIWYG Coral" }] })).toBe(true);
    expect(isLiveProduct({ tags: [{ value: "fish" }] })).toBe(true);
  });

  it("an explicit metadata override wins either way", () => {
    expect(
      isLiveProduct({ metadata: { free_shipping_eligible: true }, categories: [{ handle: "supplies" }] }),
    ).toBe(true);
    expect(
      isLiveProduct({ metadata: { free_shipping_eligible: false }, categories: [{ handle: "fish" }] }),
    ).toBe(false);
  });

  it("never guesses from the title", () => {
    // A supply named like an animal must not become eligible.
    expect(isLiveProduct({ title: "Clownfish Food", categories: [{ handle: "supplies" }] } as never)).toBe(
      false,
    );
  });

  it("an unknown or empty product is not eligible", () => {
    expect(isLiveProduct(null)).toBe(false);
    expect(isLiveProduct(undefined)).toBe(false);
    expect(isLiveProduct({})).toBe(false);
  });
});

describe("the badge rule", () => {
  it("badges a live product priced OVER the threshold", () => {
    expect(earnsLiveReward(fish, 500.01)).toBe(true);
    expect(earnsLiveReward(coral, 900)).toBe(true);
  });

  it("does not badge at exactly the threshold — the offer is 'over $500'", () => {
    expect(earnsLiveReward(fish, 500)).toBe(false);
  });

  it("does not badge below the threshold", () => {
    expect(earnsLiveReward(fish, 499.99)).toBe(false);
  });

  it("never badges supplies, however expensive", () => {
    expect(earnsLiveReward(supply, 5000)).toBe(false);
  });

  it("does not badge without a usable price", () => {
    expect(earnsLiveReward(fish, null)).toBe(false);
    expect(earnsLiveReward(fish, undefined)).toBe(false);
  });

  it("agrees with the backend threshold, which is also strictly greater", () => {
    // backend: CREDIT_MIN_LIVE_TOTAL = 500 and the check is live_total > 500
    expect(earnsLiveReward(fish, LIVE_REWARD_THRESHOLD)).toBe(false);
    expect(earnsLiveReward(fish, LIVE_REWARD_THRESHOLD + 0.01)).toBe(true);
  });
});
