import { describe, it, expect } from "vitest"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  FREE_SHIPPING_THRESHOLD,
  isEligibleClassification,
  summarizeCart,
  filterSupplyItems,
  buildSuppliesOnlyShipment,
  decideShippingCharge,
} = require("../free-shipping")

const fishCls = { metadata_override: null, category_handles: ["fish"], tag_values: [] }
const coralCls = { metadata_override: null, category_handles: ["corals"], tag_values: [] }
const supplyCls = { metadata_override: null, category_handles: ["supplies"], tag_values: ["Supplies"] }

const item = (product_id: string, unit_price: number, quantity = 1) => ({
  product_id,
  unit_price,
  quantity,
})

describe("eligibility classification", () => {
  it("threshold is $500", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(500)
  })

  it("fish and coral categories are eligible; supplies are not", () => {
    expect(isEligibleClassification(fishCls)).toBe(true)
    expect(isEligibleClassification(coralCls)).toBe(true)
    expect(isEligibleClassification(supplyCls)).toBe(false)
  })

  it("tags qualify uncategorized live products; metadata override wins both ways", () => {
    expect(
      isEligibleClassification({ metadata_override: null, category_handles: [], tag_values: ["WYSIWYG Corals"] })
    ).toBe(true)
    expect(
      isEligibleClassification({ metadata_override: false, category_handles: ["fish"], tag_values: [] })
    ).toBe(false)
    expect(
      isEligibleClassification({ metadata_override: true, category_handles: [], tag_values: [] })
    ).toBe(true)
  })

  it("no classification (unknown product) is NOT eligible — fail safe", () => {
    expect(isEligibleClassification(null)).toBe(false)
    expect(isEligibleClassification(undefined)).toBe(false)
  })

  it("inverts, macroalgae, equipment, and unclassified products NEVER qualify", () => {
    expect(
      isEligibleClassification({ metadata_override: null, category_handles: ["inverts"], tag_values: ["Invert"] })
    ).toBe(false)
    expect(
      isEligibleClassification({ metadata_override: null, category_handles: [], tag_values: ["Macroalgae"] })
    ).toBe(false)
    expect(
      isEligibleClassification({ metadata_override: null, category_handles: [], tag_values: ["Lighting"] })
    ).toBe(false)
    expect(
      isEligibleClassification({ metadata_override: null, category_handles: [], tag_values: [] })
    ).toBe(false)
  })
})

describe("cart summary — only live fish/coral counts toward the threshold", () => {
  const cls = new Map([
    ["fish_1", fishCls],
    ["coral_1", coralCls],
    ["supply_1", supplyCls],
  ])

  it("live-only cart at the threshold qualifies", () => {
    const s = summarizeCart([item("fish_1", 300), item("coral_1", 100, 2)], cls)
    expect(s.liveSubtotal).toBe(500)
    expect(s.qualifies).toBe(true)
    expect(s.hasOtherItems).toBe(false)
  })

  it("supplies NEVER contribute: $499 live + $400 supplies does not qualify", () => {
    const s = summarizeCart([item("fish_1", 499), item("supply_1", 400)], cls)
    expect(s.liveSubtotal).toBe(499)
    expect(s.qualifies).toBe(false)
    expect(s.hasOtherItems).toBe(true)
  })

  it("a supplies-only cart never qualifies at any total", () => {
    const s = summarizeCart([item("supply_1", 5000)], cls)
    expect(s.hasEligibleLive).toBe(false)
    expect(s.qualifies).toBe(false)
  })

  it("unknown products count as non-live (fail safe)", () => {
    const s = summarizeCart([item("mystery", 900)], cls)
    expect(s.qualifies).toBe(false)
  })
})

describe("supplies-only shipment quote builder", () => {
  const cls = new Map([
    ["fish_1", fishCls],
    ["coral_1", coralCls],
    ["supply_1", supplyCls],
  ])
  const suppliesParcel = { length: 12, width: 12, height: 10, weight: 5 }
  const addresses = {
    addressFrom: { city: "Portland", zip: "97211" },
    addressTo: { city: "Austin", zip: "78701" },
  }

  it("the quote excludes ALL Fish and Coral data — only supply items remain", () => {
    const built = buildSuppliesOnlyShipment({
      ...addresses,
      items: [
        { product_id: "fish_1" },
        { product_id: "coral_1" },
        { product_id: "supply_1" },
      ],
      classifications: cls,
      suppliesParcel,
    })
    expect(built.supplyItems.map((i: any) => i.product_id)).toEqual(["supply_1"])
    const serialized = JSON.stringify(built.request)
    expect(serialized).not.toContain("fish_1")
    expect(serialized).not.toContain("coral_1")
    expect(built.request.parcels).toEqual([suppliesParcel])
    expect(built.request.address_to).toEqual(addresses.addressTo)
  })

  it("filterSupplyItems keeps inverts/unclassified as chargeable supply-side items", () => {
    const kept = filterSupplyItems(
      [{ product_id: "fish_1" }, { product_id: "mystery" }],
      cls
    )
    expect(kept.map((i: any) => i.product_id)).toEqual(["mystery"])
  })

  it("a live-only cart builds NO supplies quote at all", () => {
    const built = buildSuppliesOnlyShipment({
      ...addresses,
      items: [{ product_id: "fish_1" }, { product_id: "coral_1" }],
      classifications: cls,
      suppliesParcel,
    })
    expect(built).toBeNull()
  })
})

describe("shipping charge decision", () => {
  // Overnight (selected, forced by live animals): $60. The GENUINE
  // supplies-only shipment quote (separate Shippo request): $15.
  const fees = {
    carrierAmount: 60,
    suppliesOnlyCarrierAmount: 15,
    handlingLive: 12,
    handlingSupplies: 7,
  }

  it("below the threshold nothing changes: overnight carrier + live handling", () => {
    const summary = summarizeCart(
      [item("fish_1", 200)],
      new Map([["fish_1", fishCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    expect(d).toMatchObject({ amount: 72, waived: 0, freeLivePortion: false })
  })

  it("qualifying live-only cart ships COMPLETELY free — the whole $72 is waived", () => {
    const summary = summarizeCart(
      [item("fish_1", 600)],
      new Map([["fish_1", fishCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    expect(d).toMatchObject({ amount: 0, waived: 72, freeLivePortion: true })
  })

  it("mixed cart: customer pays the ACTUAL supplies-only quote + $7; the livestock overnight rate does not inflate it", () => {
    const summary = summarizeCart(
      [item("fish_1", 600), item("supply_1", 50)],
      new Map([
        ["fish_1", fishCls],
        ["supply_1", supplyCls],
      ])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    // normal 60 + 12 = 72; supplies-only quote 15 + 7 = 22; waived 50.
    // The $60 overnight rate appears nowhere in the charge.
    expect(d).toMatchObject({
      amount: 22,
      waived: 50,
      freeLivePortion: true,
      reason: "mixed_supplies_only_charge",
    })
    expect(d.amount).toBeGreaterThan(0) // supplies never ride free
  })

  it("the discounted charge NEVER exceeds the normal charge", () => {
    const summary = summarizeCart(
      [item("fish_1", 600), item("supply_1", 50)],
      new Map([
        ["fish_1", fishCls],
        ["supply_1", supplyCls],
      ])
    )
    const d = decideShippingCharge({
      carrierAmount: 20,
      suppliesOnlyCarrierAmount: 40, // pathological: quote above selected rate
      handlingLive: 12,
      handlingSupplies: 7,
      cartHasLiveAnimals: true,
      summary,
    })
    expect(d.amount).toBe(32) // capped at normal (20 + 12)
  })

  it("a FAILED supplies-only quote falls back to the normal undiscounted charge — no guessing, no substitute rate", () => {
    const summary = summarizeCart(
      [item("fish_1", 600), item("supply_1", 50)],
      new Map([
        ["fish_1", fishCls],
        ["supply_1", supplyCls],
      ])
    )
    const d = decideShippingCharge({
      carrierAmount: 60,
      suppliesOnlyCarrierAmount: null,
      handlingLive: 12,
      handlingSupplies: 7,
      cartHasLiveAnimals: true,
      summary,
    })
    expect(d).toEqual({
      amount: 72, // full normal price — NOT 67, NOT a borrowed rate
      waived: 0,
      freeLivePortion: false,
      reason: "supplies_quote_unavailable",
    })
  })

  it("supplies-only cart keeps normal supplies pricing (their chosen rate + $7)", () => {
    const summary = summarizeCart(
      [item("supply_1", 800)],
      new Map([["supply_1", supplyCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: false, summary })
    expect(d).toMatchObject({ amount: 67, waived: 0, freeLivePortion: false })
  })

  it("classification unavailable (summary null) charges full price — never accidental free", () => {
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary: null })
    expect(d).toMatchObject({ amount: 72, waived: 0, freeLivePortion: false })
  })
})
