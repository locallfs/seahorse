import { describe, it, expect } from "vitest"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  resolveLineShipping,
  expandLivestockItems,
  packLivestock,
  parcelWeightOz,
  toShippoParcels,
  selectUpsNextDayAirRate,
  nextSafeShipDate,
  rateFingerprint,
  buildLivestockShipmentPlan,
  smallestBoxFor,
  sumUnits,
} = require("../livestock-packing")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  LIVESTOCK_BOXES,
  LIVESTOCK_THERMAL_CONFIG,
  LIVESTOCK_SHIPPING_CLASSES,
} = require("../livestock-config")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  decideThermalMode,
  decideWeatherHold,
  combineForecasts,
} = require("../livestock-weather")

type Line = {
  id?: string
  product_id?: string
  variant_id?: string
  quantity?: number
  title?: string
  meta?: Record<string, unknown> | null
}

const live = (shipping_class: string, quantity = 1, extra: Record<string, unknown> = {}): Line => ({
  id: `li_${shipping_class}_${quantity}_${Math.random().toString(36).slice(2, 7)}`,
  product_id: `prod_${shipping_class}`,
  variant_id: `var_${shipping_class}`,
  title: shipping_class,
  quantity,
  meta: {
    shipping_type: "livestock",
    livestock_type: shipping_class.startsWith("fish") ? "fish" : "coral",
    shipping_class,
    ...extra,
  },
})

const dry = (quantity = 1, extra: Record<string, unknown> = {}): Line => ({
  id: `li_dry_${Math.random().toString(36).slice(2, 7)}`,
  product_id: "prod_dry",
  variant_id: "var_dry",
  title: "Dry good",
  quantity,
  meta: { shipping_type: "dry", ...extra },
})

const box = (id: string) => LIVESTOCK_BOXES.find((b: any) => b.id === id)
const dims = (p: any) => `${p.box.lengthIn}x${p.box.widthIn}x${p.box.heightIn}`

function pack(lines: Line[]) {
  const { items, dry: dryLines, invalid } = expandLivestockItems(lines)
  return { ...packLivestock(items), items, dryLines, invalid }
}

describe("config sanity", () => {
  it("boxes are the three configured livestock boxes, ascending", () => {
    expect(LIVESTOCK_BOXES.map((b: any) => b.id)).toEqual([
      "live_small",
      "live_medium",
      "live_large",
    ])
    expect(LIVESTOCK_BOXES.map((b: any) => b.maxPackUnits)).toEqual([2, 8, 18])
  })

  it("smallestBoxFor honours the documented thresholds", () => {
    expect(smallestBoxFor(1.5).id).toBe("live_small")
    expect(smallestBoxFor(2).id).toBe("live_small")
    expect(smallestBoxFor(2.5).id).toBe("live_medium")
    expect(smallestBoxFor(8).id).toBe("live_medium")
    expect(smallestBoxFor(9).id).toBe("live_large")
    expect(smallestBoxFor(18).id).toBe("live_large")
    expect(smallestBoxFor(18.5)).toBeNull()
  })
})

describe("metadata resolution", () => {
  it("reads a livestock class", () => {
    const r = resolveLineShipping({ shipping_type: "livestock", shipping_class: "coral_frag" })
    expect(r).toMatchObject({ kind: "livestock", packUnits: 0.5, packedWeightOz: 12 })
  })

  it("explicit overrides beat the class defaults", () => {
    const r = resolveLineShipping({
      shipping_type: "livestock",
      shipping_class: "fish_medium",
      shipping_pack_units: 2.5,
      shipping_packed_weight_oz: 56,
    })
    expect(r).toMatchObject({ kind: "livestock", packUnits: 2.5, packedWeightOz: 56 })
  })

  it("accepts overrides with no class at all", () => {
    const r = resolveLineShipping({
      shipping_type: "livestock",
      shipping_pack_units: 3,
      shipping_packed_weight_oz: 40,
    })
    expect(r).toMatchObject({ kind: "livestock", packUnits: 3, packedWeightOz: 40 })
  })

  it("treats dry goods as dry", () => {
    expect(resolveLineShipping({ shipping_type: "dry" })).toEqual({
      kind: "dry",
      canShipWithLivestock: false,
    })
    expect(
      resolveLineShipping({ shipping_type: "dry", can_ship_with_livestock: true })
    ).toEqual({ kind: "dry", canShipWithLivestock: true })
  })

  it("treats unmarked products as dry, never as a zero-weight animal", () => {
    expect(resolveLineShipping({}).kind).toBe("dry")
    expect(resolveLineShipping(null).kind).toBe("dry")
  })
})

describe("expansion into packable items", () => {
  it("one packable item per unit of quantity", () => {
    // 2 medium fish + 3 coral frags => five items, per the spec example.
    const { items } = expandLivestockItems([live("fish_medium", 2), live("coral_frag", 3)])
    expect(items).toHaveLength(5)
    expect(items.filter((i: any) => i.shippingClass === "fish_medium")).toHaveLength(2)
    expect(items.filter((i: any) => i.shippingClass === "coral_frag")).toHaveLength(3)
    expect(sumUnits(items)).toBe(2 * 2 + 3 * 0.5)
  })
})

// ---------------------------------------------------------------- required 1
describe("Test 1 — 1 coral frag", () => {
  it("packs into one 6x6x6", () => {
    const { parcels } = pack([live("coral_frag", 1)])
    expect(parcels).toHaveLength(1)
    expect(dims(parcels[0])).toBe("6x6x6")
  })
})

// ---------------------------------------------------------------- required 2
describe("Test 2 — 4 coral frags (2 units)", () => {
  it("packs into one 6x6x6", () => {
    const { parcels } = pack([live("coral_frag", 4)])
    expect(sumUnits(parcels[0].items)).toBe(2)
    expect(parcels).toHaveLength(1)
    expect(dims(parcels[0])).toBe("6x6x6")
  })
})

// ---------------------------------------------------------------- required 3
describe("Test 3 — 1 medium fish + 1 coral frag (2.5 units)", () => {
  it("packs into one 12x12x12", () => {
    const { parcels } = pack([live("fish_medium", 1), live("coral_frag", 1)])
    expect(parcels).toHaveLength(1)
    expect(sumUnits(parcels[0].items)).toBe(2.5)
    expect(dims(parcels[0])).toBe("12x12x12")
  })
})

// ---------------------------------------------------------------- required 4
describe("Test 4 — 2 medium fish + 3 coral frags (5.5 units)", () => {
  it("packs into one 12x12x12", () => {
    const { parcels } = pack([live("fish_medium", 2), live("coral_frag", 3)])
    expect(parcels).toHaveLength(1)
    expect(sumUnits(parcels[0].items)).toBe(5.5)
    expect(dims(parcels[0])).toBe("12x12x12")
  })

  it("weighs exactly 168 oz with a heat pack — the worked example", () => {
    // 2x48 fish + 3x12 coral = 132, + 24 tare + 4 heat + 8 buffer = 168
    const { parcels } = pack([live("fish_medium", 2), live("coral_frag", 3)])
    expect(parcelWeightOz(parcels[0], "heat")).toBe(168)
  })

  it("swaps the thermal pack weight without touching contents", () => {
    const { parcels } = pack([live("fish_medium", 2), live("coral_frag", 3)])
    expect(parcelWeightOz(parcels[0], "none")).toBe(164)
    expect(parcelWeightOz(parcels[0], "cold")).toBe(180)
  })

  it("produces the documented Shippo parcel payload", () => {
    const { parcels } = pack([live("fish_medium", 2), live("coral_frag", 3)])
    expect(toShippoParcels(parcels, "heat")).toEqual([
      {
        length: "12",
        width: "12",
        height: "12",
        distance_unit: "in",
        weight: "168",
        mass_unit: "oz",
      },
    ])
  })
})

// ---------------------------------------------------------------- required 5
describe("Test 5 — exactly 18 pack units", () => {
  it("packs into one 18x14x14", () => {
    // 3 xlarge fish (6 each) = 18
    const { parcels } = pack([live("fish_xlarge", 3)])
    expect(sumUnits(parcels[0].items)).toBe(18)
    expect(parcels).toHaveLength(1)
    expect(dims(parcels[0])).toBe("18x14x14")
  })
})

// ---------------------------------------------------------------- required 6
describe("Test 6 — more than 18 pack units", () => {
  it("splits into multiple parcels, none over capacity", () => {
    // 4 xlarge fish = 24 units
    const { parcels } = pack([live("fish_xlarge", 4)])
    expect(parcels.length).toBeGreaterThan(1)
    for (const p of parcels) {
      expect(sumUnits(p.items)).toBeLessThanOrEqual(p.box.maxPackUnits)
    }
    expect(parcels.reduce((t: number, p: any) => t + sumUnits(p.items), 0)).toBe(24)
  })

  it("keeps box count minimal and then shrinks the last box", () => {
    // 24 units -> large(18) + the remaining 6 in a medium, not a second large.
    const { parcels } = pack([live("fish_xlarge", 4)])
    expect(parcels.map((p: any) => p.box.id)).toEqual(["live_large", "live_medium"])
  })

  it("weighs each parcel from its own real contents", () => {
    const { parcels } = pack([live("fish_xlarge", 4)])
    const [big, small] = parcels
    // 3 xlarge = 384 oz + 40 tare + 4 heat + 8 buffer
    expect(parcelWeightOz(big, "heat")).toBe(3 * 128 + 40 + 4 + 8)
    // 1 xlarge = 128 oz + 24 tare + 4 heat + 8 buffer
    expect(parcelWeightOz(small, "heat")).toBe(128 + 24 + 4 + 8)
  })

  it("handles a large mixed shipment without exceeding any box", () => {
    const { parcels } = pack([
      live("fish_large", 5), // 20 units
      live("coral_medium", 4), // 8 units
      live("coral_frag", 6), // 3 units
    ])
    expect(sumUnits(parcels.flatMap((p: any) => p.items))).toBe(31)
    for (const p of parcels) {
      expect(sumUnits(p.items)).toBeLessThanOrEqual(p.box.maxPackUnits)
    }
  })

  it("reports an item that cannot fit any box instead of silently dropping it", () => {
    const { parcels, unpackable } = pack([
      live("fish_medium", 1, { shipping_pack_units: 25, shipping_packed_weight_oz: 300 }),
    ])
    expect(parcels).toHaveLength(0)
    expect(unpackable).toHaveLength(1)
  })
})

// ---------------------------------------------------------------- required 7
describe("Test 7 — mixed livestock and dry goods", () => {
  it("separates them and never packs dry goods as livestock", () => {
    const { parcels, dryLines, items } = pack([
      live("fish_medium", 1),
      dry(2),
      live("coral_frag", 1),
    ])
    expect(items).toHaveLength(2)
    expect(items.every((i: any) => i.shippingClass !== null)).toBe(true)
    expect(dryLines).toHaveLength(1)
    expect(dryLines[0].product_id).toBe("prod_dry")
    // Livestock parcel contains only the two livestock items.
    expect(parcels).toHaveLength(1)
    expect(parcels[0].items).toHaveLength(2)
  })

  it("a dry-only cart yields no livestock parcels at all", () => {
    const { parcels, items, dryLines } = pack([dry(1), dry(3)])
    expect(items).toHaveLength(0)
    expect(parcels).toHaveLength(0)
    expect(dryLines).toHaveLength(2)
  })

  it("flags a dry good that opted into riding with livestock", () => {
    const { dryLines } = pack([live("coral_frag", 1), dry(1, { can_ship_with_livestock: true })])
    expect(dryLines[0].canShipWithLivestock).toBe(true)
  })
})

// ---------------------------------------------------------------- required 8
describe("Test 8 — invalid livestock product", () => {
  it("reports a livestock line with no shipping class", () => {
    const { invalid, items } = pack([
      { id: "li_bad", product_id: "prod_bad", variant_id: "var_bad", quantity: 1, meta: { shipping_type: "livestock" } },
    ])
    expect(items).toHaveLength(0)
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ productId: "prod_bad", variantId: "var_bad" })
    expect(invalid[0].reason).toContain("no shipping_class")
  })

  it("reports an unknown class by name", () => {
    const { invalid } = pack([live("fish_enormous", 1)])
    expect(invalid).toHaveLength(1)
    expect(invalid[0].reason).toContain("fish_enormous")
  })

  it("rejects a zero or negative packed weight", () => {
    const { invalid } = pack([
      live("fish_medium", 1, { shipping_packed_weight_oz: 0, shipping_pack_units: 0 }),
    ])
    expect(invalid).toHaveLength(1)
  })

  it("never lets a livestock item through with zero shipping weight", () => {
    const { items } = pack([live("coral_frag", 2), live("fish_small", 1)])
    expect(items.every((i: any) => i.packedWeightOz > 0 && i.packUnits > 0)).toBe(true)
  })
})

// ---------------------------------------------------------------- required 9
describe("Test 9 — selecting UPS Next Day Air among several services", () => {
  const rates = [
    { provider: "UPS", servicelevel: { token: "ups_ground", name: "UPS Ground" }, amount: "14.20" },
    { provider: "UPS", servicelevel: { token: "ups_second_day_air", name: "UPS 2nd Day Air" }, amount: "38.90" },
    { provider: "UPS", servicelevel: { token: "ups_next_day_air", name: "UPS Next Day Air" }, amount: "92.45" },
    { provider: "UPS", servicelevel: { token: "ups_next_day_air_saver", name: "UPS Next Day Air Saver" }, amount: "81.10" },
  ]

  it("picks ups_next_day_air exactly, not the Saver and not the cheapest", () => {
    const r = selectUpsNextDayAirRate(rates)
    expect(r?.servicelevel?.token).toBe("ups_next_day_air")
    expect(r?.amount).toBe("92.45")
  })

  it("reads a flattened servicelevel_token too", () => {
    const r = selectUpsNextDayAirRate([
      { provider: "UPS", servicelevel_token: "ups_ground", amount: "10.00" },
      { provider: "UPS", servicelevel_token: "ups_next_day_air", amount: "77.00" },
    ])
    expect(r?.amount).toBe("77.00")
  })

  it("reads the carrier from carrier_account when provider is absent", () => {
    const r = selectUpsNextDayAirRate([
      { carrier_account: { carrier: "ups" }, servicelevel: { token: "ups_next_day_air" }, amount: "70.00" },
    ])
    expect(r?.amount).toBe("70.00")
  })

  it("takes the cheapest when two UPS accounts both return Next Day Air", () => {
    const r = selectUpsNextDayAirRate([
      { provider: "UPS", servicelevel: { token: "ups_next_day_air" }, amount: "99.00" },
      { provider: "UPS", servicelevel: { token: "ups_next_day_air" }, amount: "88.00" },
    ])
    expect(r?.amount).toBe("88.00")
  })

  it("ignores a non-UPS carrier offering the same token", () => {
    expect(
      selectUpsNextDayAirRate([
        { provider: "FedEx", servicelevel: { token: "ups_next_day_air" }, amount: "50.00" },
      ])
    ).toBeNull()
  })
})

// --------------------------------------------------------------- required 10
describe("Test 10 — UPS Next Day Air not offered", () => {
  it("returns null rather than quietly choosing a slower service", () => {
    const rates = [
      { provider: "UPS", servicelevel: { token: "ups_ground" }, amount: "14.20" },
      { provider: "UPS", servicelevel: { token: "ups_second_day_air" }, amount: "38.90" },
      { provider: "USPS", servicelevel: { token: "usps_priority" }, amount: "22.10" },
    ]
    expect(selectUpsNextDayAirRate(rates)).toBeNull()
  })

  it("returns null for an empty or missing rate list", () => {
    expect(selectUpsNextDayAirRate([])).toBeNull()
    expect(selectUpsNextDayAirRate(null)).toBeNull()
    expect(selectUpsNextDayAirRate(undefined)).toBeNull()
  })
})

describe("safe ship date", () => {
  it("ships same day Monday through Thursday", () => {
    // 2026-10-05 is a Monday.
    expect(nextSafeShipDate(new Date("2026-10-05T12:00:00Z"))).toMatchObject({
      weekday: "monday",
      heldDays: 0,
      shipsSameDay: true,
    })
    expect(nextSafeShipDate(new Date("2026-10-08T12:00:00Z")).weekday).toBe("thursday")
  })

  it("accepts a Friday order and schedules it for Monday", () => {
    const r = nextSafeShipDate(new Date("2026-10-09T12:00:00Z")) // Friday
    expect(r.weekday).toBe("monday")
    expect(r.heldDays).toBe(3)
    expect(r.shipsSameDay).toBe(false)
    expect(r.shipDate).toBe("2026-10-12")
  })

  it("accepts weekend orders and schedules them for Monday", () => {
    expect(nextSafeShipDate(new Date("2026-10-10T12:00:00Z")).shipDate).toBe("2026-10-12")
    expect(nextSafeShipDate(new Date("2026-10-11T12:00:00Z")).shipDate).toBe("2026-10-12")
  })
})

describe("rate fingerprint", () => {
  const parcels = [
    { length: "12", width: "12", height: "12", distance_unit: "in", weight: "168", mass_unit: "oz" },
  ]

  it("is stable for an identical shipment", () => {
    const a = rateFingerprint({ cartId: "cart_1", address: { postal_code: "97211", province: "OR", country_code: "us" }, parcels, serviceLevel: "ups_next_day_air" })
    const b = rateFingerprint({ cartId: "cart_1", address: { postal_code: "97211", province: "or", country_code: "US" }, parcels, serviceLevel: "ups_next_day_air" })
    expect(a).toBe(b)
  })

  it("changes when the postal code, state or country changes", () => {
    const base = { cartId: "cart_1", parcels, serviceLevel: "ups_next_day_air" }
    const pdx = rateFingerprint({ ...base, address: { postal_code: "97211", province: "OR", country_code: "US" } })
    expect(rateFingerprint({ ...base, address: { postal_code: "33101", province: "OR", country_code: "US" } })).not.toBe(pdx)
    expect(rateFingerprint({ ...base, address: { postal_code: "97211", province: "FL", country_code: "US" } })).not.toBe(pdx)
    expect(rateFingerprint({ ...base, address: { postal_code: "97211", province: "OR", country_code: "CA" } })).not.toBe(pdx)
  })

  it("changes when parcels change", () => {
    const addr = { postal_code: "97211", province: "OR", country_code: "US" }
    const one = rateFingerprint({ cartId: "c", address: addr, parcels, serviceLevel: "ups_next_day_air" })
    const two = rateFingerprint({
      cartId: "c",
      address: addr,
      parcels: [...parcels, { ...parcels[0], weight: "300" }],
      serviceLevel: "ups_next_day_air",
    })
    expect(one).not.toBe(two)
  })

  it("distinguishes residential from commercial", () => {
    const addr = { postal_code: "97211", province: "OR", country_code: "US" }
    const res = rateFingerprint({ cartId: "c", address: addr, parcels, serviceLevel: "ups_next_day_air" })
    const com = rateFingerprint({ cartId: "c", address: { ...addr, company: "Reef Co" }, parcels, serviceLevel: "ups_next_day_air" })
    expect(res).not.toBe(com)
  })
})

describe("shipment plan kept for fulfillment", () => {
  it("records every parcel's box, weight and real contents", () => {
    const { parcels } = pack([live("fish_medium", 2), live("coral_frag", 3)])
    const shippoParcels = toShippoParcels(parcels, "heat")
    const plan = buildLivestockShipmentPlan({ parcels, thermalMode: "heat", shippoParcels })

    expect(plan).toMatchObject({
      shipping_type: "livestock",
      carrier: "UPS",
      service_level: "ups_next_day_air",
      live_arrival_guarantee: true,
      temperature_control: "heat",
      parcel_count: 1,
    })
    expect(plan.parcels[0]).toMatchObject({ box_id: "live_medium", weight_oz: 168 })
    expect(plan.parcels[0].contents).toHaveLength(5)
  })

  it("carries no secrets", () => {
    const { parcels } = pack([live("coral_frag", 1)])
    const json = JSON.stringify(
      buildLivestockShipmentPlan({
        parcels,
        thermalMode: "none",
        shippoParcels: toShippoParcels(parcels, "none"),
      })
    )
    expect(json.toLowerCase()).not.toContain("api_key")
    expect(json.toLowerCase()).not.toContain("shippo_api")
    expect(json.toLowerCase()).not.toContain("authorization")
  })
})

describe("weather-driven thermal mode", () => {
  it("calls for a heat pack when it is cold", () => {
    expect(decideThermalMode(38, 55).mode).toBe("heat")
    expect(decideThermalMode(50, 60).mode).toBe("heat") // boundary is inclusive
  })

  it("calls for a cold pack when it is hot", () => {
    expect(decideThermalMode(70, 95).mode).toBe("cold")
    expect(decideThermalMode(70, 85).mode).toBe("cold") // boundary is inclusive
  })

  it("calls for nothing in between", () => {
    expect(decideThermalMode(60, 78).mode).toBe("none")
  })

  it("prefers heat when it is both cold at night and hot by day", () => {
    // A freezing night will kill the animal before a hot afternoon does.
    expect(decideThermalMode(30, 95).mode).toBe("heat")
  })

  it("recommends a weather hold only at genuine extremes", () => {
    expect(decideWeatherHold(40, 80).hold).toBe(false)
    expect(decideWeatherHold(20, 80).hold).toBe(true)
    expect(decideWeatherHold(40, 104).hold).toBe(true)
  })

  it("takes the harshest reading across the route", () => {
    expect(combineForecasts([{ minF: 55, maxF: 70 }, { minF: 31, maxF: 64 }])).toEqual({
      minF: 31,
      maxF: 70,
    })
  })

  it("returns null when no forecast point produced numbers", () => {
    expect(combineForecasts([null, undefined])).toBeNull()
  })
})

describe("thermal pack weights come from config", () => {
  it("matches the configured values", () => {
    const { parcels } = pack([live("coral_frag", 1)])
    const base = parcelWeightOz(parcels[0], "none")
    expect(parcelWeightOz(parcels[0], "heat") - base).toBe(
      LIVESTOCK_THERMAL_CONFIG.heatPackWeightOz
    )
    expect(parcelWeightOz(parcels[0], "cold") - base).toBe(
      LIVESTOCK_THERMAL_CONFIG.coldPackWeightOz
    )
  })

  it("every configured class has a positive weight and unit value", () => {
    for (const [name, cls] of Object.entries(LIVESTOCK_SHIPPING_CLASSES) as any) {
      expect(cls.packUnits, name).toBeGreaterThan(0)
      expect(cls.packedWeightOz, name).toBeGreaterThan(0)
      expect(["fish", "coral"]).toContain(cls.type)
    }
  })
})
