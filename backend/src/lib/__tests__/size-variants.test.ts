import { describe, it, expect } from "vitest"
import { planSizeVariants, PlanArgs } from "../size-variants"

const base = (over: Partial<PlanArgs> = {}): PlanArgs => ({
  size_system: "fish",
  sizes: [],
  existing: [],
  product_title: "Yellow Tang",
  product_handle: "yellow-tang",
  taken_skus: new Set<string>(),
  foreign_codes: new Set<string>(),
  ...over,
})

const size = (value: string, price = 50, extra = {}) => ({
  value,
  price,
  ...extra,
})

describe("validation", () => {
  it("rejects an empty size list", () => {
    const plan = planSizeVariants(base())
    expect(plan.ok).toBe(false)
  })

  it("rejects sizes outside the fixed fish list", () => {
    const plan = planSizeVariants(base({ sizes: [size("Jumbo")] }))
    expect(plan).toMatchObject({ ok: false })
    if (!plan.ok) expect(plan.errors[0]).toMatch(/not a valid fish size/)
  })

  it("rejects duplicate sizes even with case/spacing differences", () => {
    const plan = planSizeVariants(
      base({ sizes: [size("Medium"), size("  medium ")] })
    )
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.errors[0]).toMatch(/Duplicate size/)
  })

  it("rejects a sale price at or above the regular price", () => {
    const plan = planSizeVariants(
      base({ sizes: [size("Medium", 50, { sale_price: 50 })] })
    )
    expect(plan.ok).toBe(false)
  })

  it("rejects SKUs and UPCs that belong to another product (visible review, no guessing)", () => {
    const skuPlan = planSizeVariants(
      base({
        sizes: [size("Medium", 50, { sku: "WS-OTHER" })],
        foreign_codes: new Set(["WS-OTHER"]),
      })
    )
    expect(skuPlan.ok).toBe(false)
    const upcPlan = planSizeVariants(
      base({
        sizes: [size("Medium", 50, { upc_barcode: "012345678905" })],
        foreign_codes: new Set(["012345678905"]),
      })
    )
    expect(upcPlan.ok).toBe(false)
  })
})

describe("creating sizes", () => {
  it("adds one variant per enabled size with minted, collision-safe SKUs", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Small", 40), size("Medium", 60), size("Show", 200)],
        taken_skus: new Set(["WS-YELLOW-TANG-V01"]),
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.create).toHaveLength(3)
    const skus = plan.create.map((c) => c.sku)
    expect(new Set(skus).size).toBe(3)
    expect(skus).not.toContain("WS-YELLOW-TANG-V01")
    expect(plan.create.map((c) => c.title)).toEqual(["Small", "Medium", "Show"])
  })

  it("normalizes fixed-list labels to canonical display casing", () => {
    const plan = planSizeVariants(
      base({
        size_system: "coral",
        sizes: [size("colony", 120), size("2½\"", 45)],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.create.map((c) => c.title).sort()).toEqual(["2½\"", "Colony"])
    expect(plan.option_values).toEqual(["2½\"", "Colony"]) // Colony last
  })
})

describe("converting the placeholder variant", () => {
  it("a lone Default variant becomes the first new size — same variant id, SKU preserved", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Medium", 60), size("Large", 90)],
        existing: [
          { id: "var_1", title: "Default variant", sku: "WS-YELLOW-TANG", size_value: null },
        ],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.convert).toMatchObject({
      variant_id: "var_1",
      title: "Medium",
      sku: "WS-YELLOW-TANG",
    })
    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].title).toBe("Large")
  })

  it("does NOT convert when the product already has real size variants", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Medium", 60), size("Large", 90)],
        existing: [
          { id: "var_1", title: "Medium", sku: "WS-A", size_value: "Medium" },
          { id: "var_2", title: "Small", sku: "WS-B", size_value: "Small" },
        ],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.convert).toBeNull()
    expect(plan.update.map((u) => u.variant_id)).toEqual(["var_1"])
    expect(plan.create.map((c) => c.title)).toEqual(["Large"])
  })
})

describe("updating sizes", () => {
  it("matches by Size option value and keeps the existing SKU when none is supplied", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Medium", 75, { quantity: 4 })],
        existing: [
          { id: "var_1", title: "Medium", sku: "WS-YT-MD", size_value: "Medium" },
        ],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.update).toEqual([
      expect.objectContaining({
        variant_id: "var_1",
        sku: "WS-YT-MD",
        price: 75,
        quantity: 4,
      }),
    ])
    expect(plan.create).toHaveLength(0)
  })

  it("changing one size's price never touches the other sizes", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Medium", 99)],
        existing: [
          { id: "var_1", title: "Medium", sku: "WS-A", size_value: "Medium" },
          { id: "var_2", title: "Large", sku: "WS-B", size_value: "Large" },
        ],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const touched = [
      ...plan.update.map((u) => u.variant_id),
      ...(plan.convert ? [plan.convert.variant_id] : []),
    ]
    expect(touched).toEqual(["var_1"])
    // var_2's Large value survives in the option value set, in fixed order
    expect(plan.option_values).toEqual(["Medium", "Large"])
  })

  it("disable is a flag, not a delete — the size stays in the plan", () => {
    const plan = planSizeVariants(
      base({
        sizes: [size("Medium", 60, { disabled: true })],
        existing: [
          { id: "var_1", title: "Medium", sku: "WS-A", size_value: "Medium" },
        ],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.update[0].disabled).toBe(true)
  })
})

describe("supply sizes", () => {
  it("accepts custom labels and records the staff ordering verbatim", () => {
    const plan = planSizeVariants(
      base({
        size_system: "supply",
        product_title: "Reef Additive",
        product_handle: "reef-additive",
        sizes: [size("100 ml", 12), size("500 ml", 39), size("1 L", 65)],
      })
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.size_order).toEqual(["100 ml", "500 ml", "1 L"])
    expect(plan.option_values).toEqual(["100 ml", "500 ml", "1 L"])
  })

  it("fish/coral plans carry no supply ordering", () => {
    const plan = planSizeVariants(base({ sizes: [size("Tiny", 20)] }))
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.size_order).toBeNull()
  })
})
