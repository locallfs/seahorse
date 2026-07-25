import { describe, it, expect } from "vitest";
import { compareNames, sortProductsAlpha, sortByName } from "../alphaSort";

const p = (id: string, title: string, variantTitle?: string) => ({
  id,
  title,
  variants: variantTitle ? [{ title: variantTitle }] : [],
});

describe("A–Z product ordering", () => {
  it("sorts by customer-visible title A to Z", () => {
    const sorted = sortProductsAlpha([p("1", "Zoanthid"), p("2", "Acropora"), p("3", "Montipora")]);
    expect(sorted.map((x) => x.title)).toEqual(["Acropora", "Montipora", "Zoanthid"]);
  });
  it("is case-insensitive", () => {
    const sorted = sortProductsAlpha([p("1", "zebra Blenny"), p("2", "Angelfish"), p("3", "CLOWNFISH")]);
    expect(sorted.map((x) => x.title)).toEqual(["Angelfish", "CLOWNFISH", "zebra Blenny"]);
  });
  it("ignores leading/trailing whitespace", () => {
    const sorted = sortProductsAlpha([p("1", "  Wrasse"), p("2", "Anthias  "), p("3", " Goby")]);
    expect(sorted.map((x) => x.title.trim())).toEqual(["Anthias", "Goby", "Wrasse"]);
  });
  it("sorts numbered names naturally (2 before 10)", () => {
    const sorted = sortProductsAlpha([
      p("1", "Frag Pack 10"),
      p("2", "Frag Pack 2"),
      p("3", "Frag Pack 1"),
    ]);
    expect(sorted.map((x) => x.title)).toEqual(["Frag Pack 1", "Frag Pack 2", "Frag Pack 10"]);
  });
  it("identical titles tie-break on variant title, then product id — fully stable", () => {
    const sorted = sortProductsAlpha([
      p("z9", "Torch Coral", "Large"),
      p("a1", "Torch Coral", "Default"),
      p("m5", "Torch Coral", "Default"),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["a1", "m5", "z9"]);
  });
});

describe("stable pagination + filtering", () => {
  const catalog = [
    p("1", "Acropora 10"), p("2", "acropora 2"), p("3", "Blenny"),
    p("4", "Chalice"), p("5", "Duncan"), p("6", "Euphyllia"),
    p("7", "Goby"), p("8", "Hammer"), p("9", "Torch"),
  ];
  it("page slices of the sorted list never reshuffle (products cannot jump pages)", () => {
    const sorted = sortProductsAlpha(catalog);
    const page1 = sorted.slice(0, 4);
    const page2 = sorted.slice(4, 8);
    // Re-sorting any page changes nothing — the global order is already total.
    expect(sortProductsAlpha(page1)).toEqual(page1);
    expect(sortProductsAlpha(page2)).toEqual(page2);
    // Deterministic: sorting twice gives the identical sequence.
    expect(sortProductsAlpha(catalog)).toEqual(sorted);
  });
  it("filtering keeps the remaining results in the same alphabetical order", () => {
    const sorted = sortProductsAlpha(catalog);
    const filtered = sorted.filter((x) => x.title.toLowerCase().includes("o"));
    expect(filtered).toEqual(sortProductsAlpha(filtered));
  });
});

describe("named lists (categories, tags, filter options)", () => {
  it("sorts by visible name, case-insensitively and naturally", () => {
    const names = sortByName(
      [{ n: "zoas" }, { n: "Acans" }, { n: "Tier 2" }, { n: "Tier 10" }],
      (x) => x.n
    ).map((x) => x.n);
    expect(names).toEqual(["Acans", "Tier 2", "Tier 10", "zoas"]);
  });
  it("compareNames treats null/undefined as empty", () => {
    expect(compareNames(null, "A")).toBeLessThan(0);
    expect(compareNames("A", undefined)).toBeGreaterThan(0);
  });
});
