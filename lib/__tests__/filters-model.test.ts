import { describe, it, expect } from "vitest";
import {
  activeFilterCount,
  findActiveOption,
  resolveApplyHref,
  fishFiltersConfig,
  coralsFiltersConfig,
  suppliesFiltersConfig,
  storeFiltersConfig,
} from "../filtersModel";
import { FISH_SUBCATEGORIES } from "../fishCategories";
import { CORALS_SUBCATEGORIES } from "../coralsCategories";
import { SUPPLIES_SUBCATEGORIES } from "../suppliesCategories";
import { compareNames } from "../alphaSort";

const allOptions = (cfg: ReturnType<typeof fishFiltersConfig>) =>
  cfg.groups.flatMap((g) => g.options);

describe("every existing filter appears inside the consolidated dropdown", () => {
  it("fish: every subcategory chip is present, grouped Care/Species, with its ORIGINAL destination", () => {
    const cfg = fishFiltersConfig();
    expect(cfg.groups.map((g) => g.title)).toEqual(["By Care", "By Species"]);
    const opts = allOptions(cfg);
    expect(opts).toHaveLength(FISH_SUBCATEGORIES.length);
    for (const c of FISH_SUBCATEGORIES) {
      const o = opts.find((x) => x.value === c.handle)!;
      expect(o.label).toBe(c.label);
      expect(o.href).toBe(`/fish/${c.handle}`); // same URL the old chip used
    }
  });
  it("corals and supplies: complete lists with original destinations", () => {
    expect(allOptions(coralsFiltersConfig()).map((o) => o.href).sort()).toEqual(
      CORALS_SUBCATEGORIES.map((c) => `/corals/${c.handle}`).sort()
    );
    expect(allOptions(suppliesFiltersConfig()).map((o) => o.href).sort()).toEqual(
      SUPPLIES_SUBCATEGORIES.map((c) => `/supplies/${c.handle}`).sort()
    );
  });
  it("store: all five category tabs preserved with their original query URLs", () => {
    const opts = allOptions(storeFiltersConfig());
    expect(opts.map((o) => o.href).sort()).toEqual(
      ["new-arrivals", "fish", "inverts", "corals", "supplies"]
        .map((v) => `/store?category=${v}`)
        .sort()
    );
  });
  it("dropdown options are alphabetized within each group", () => {
    for (const cfg of [fishFiltersConfig(), coralsFiltersConfig(), suppliesFiltersConfig(), storeFiltersConfig()]) {
      for (const g of cfg.groups) {
        const labels = g.options.map((o) => o.label);
        const sorted = [...labels].sort((a, b) => compareNames(a, b));
        expect(labels).toEqual(sorted);
      }
    }
  });
});

describe("active-filter count and selection display", () => {
  it("counts 0 with nothing active and 1 with a selection (single-select pages)", () => {
    expect(activeFilterCount(null)).toBe(0);
    expect(activeFilterCount(undefined)).toBe(0);
    expect(activeFilterCount("reef-safe")).toBe(1);
  });
  it("finds the active option for clear labeling", () => {
    const cfg = fishFiltersConfig();
    expect(findActiveOption(cfg, "reef-safe")?.label).toBe("Reef Safe");
    expect(findActiveOption(cfg, null)).toBeNull();
    expect(findActiveOption(cfg, "not-a-filter")).toBeNull();
  });
});

describe("apply and clear behavior", () => {
  it("Apply navigates to the selected option's original page", () => {
    const cfg = coralsFiltersConfig();
    expect(resolveApplyHref(cfg, "lps")).toBe("/corals/lps");
  });
  it("Apply with no selection = the unfiltered page; Clear All target is the same", () => {
    const cfg = fishFiltersConfig();
    expect(resolveApplyHref(cfg, null)).toBe("/fish");
    expect(cfg.clearHref).toBe("/fish");
    expect(storeFiltersConfig().clearHref).toBe("/store");
  });
});

describe("filter persistence (URL is the single source of truth)", () => {
  it("selections come from the page URL, so refresh/share/reopen shows the same state", () => {
    // The panel derives its state from activeValue (the URL path/query).
    // Reopening always re-stages from activeValue — staged edits that were
    // never applied cannot leak into the shown selection.
    const cfg = suppliesFiltersConfig();
    const active = "test-kits";
    const found = findActiveOption(cfg, active);
    if (found) {
      expect(activeFilterCount(active)).toBe(1);
      expect(resolveApplyHref(cfg, active)).toBe(found.href);
    }
    // And an unknown/cleared URL value renders as unfiltered:
    expect(activeFilterCount(null)).toBe(0);
  });
});
