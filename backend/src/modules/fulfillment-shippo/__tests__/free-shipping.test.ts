import { describe, it, expect } from "vitest"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  FREE_SHIPPING_THRESHOLD,
  isEligibleClassification,
  summarizeCart,
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

describe("shipping charge decision", () => {
  const fees = { carrierAmount: 60, handlingLive: 12, handlingSupplies: 7 }

  it("below the threshold nothing changes: carrier + live handling", () => {
    const summary = summarizeCart(
      [item("fish_1", 200)],
      new Map([["fish_1", fishCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    expect(d).toEqual({ amount: 72, freeLivePortion: false })
  })

  it("qualifying live-only cart ships free", () => {
    const summary = summarizeCart(
      [item("fish_1", 600)],
      new Map([["fish_1", fishCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    expect(d).toEqual({ amount: 0, freeLivePortion: true })
  })

  it("mixed cart: live portion free, supplies STILL charged (carrier + supplies handling)", () => {
    const summary = summarizeCart(
      [item("fish_1", 600), item("supply_1", 50)],
      new Map([
        ["fish_1", fishCls],
        ["supply_1", supplyCls],
      ])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary })
    expect(d).toEqual({ amount: 67, freeLivePortion: true })
    expect(d.amount).toBeGreaterThan(0) // supplies never ride free
  })

  it("supplies-only cart keeps normal supplies pricing", () => {
    const summary = summarizeCart(
      [item("supply_1", 800)],
      new Map([["supply_1", supplyCls]])
    )
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: false, summary })
    expect(d).toEqual({ amount: 67, freeLivePortion: false })
  })

  it("classification unavailable (summary null) charges full price — never accidental free", () => {
    const d = decideShippingCharge({ ...fees, cartHasLiveAnimals: true, summary: null })
    expect(d).toEqual({ amount: 72, freeLivePortion: false })
  })
})
