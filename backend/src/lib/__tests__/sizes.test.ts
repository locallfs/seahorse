import { describe, it, expect } from "vitest"
import {
  FISH_SIZES,
  CORAL_SIZES,
  SUPPLY_STANDARD_SIZES,
  SIZE_OPTION_TITLE,
  canonicalFixedSize,
  isValidSizeForSystem,
  orderSizeValues,
} from "../sizes"

describe("canonical size lists (contract with storefront lib/sizes.ts)", () => {
  it("fish: exact fixed list in the exact required order", () => {
    expect([...FISH_SIZES]).toEqual([
      "Tiny",
      "Small",
      "Small–Medium",
      "Medium",
      "Medium–Large",
      "Large",
      "Show",
    ])
  })

  it("coral: half-inch ladder through 6\" with Colony last", () => {
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
    ])
  })

  it("supply standard sizes are Small/Medium/Large and the option is titled Size", () => {
    expect([...SUPPLY_STANDARD_SIZES]).toEqual(["Small", "Medium", "Large"])
    expect(SIZE_OPTION_TITLE).toBe("Size")
  })
})

describe("validation + ordering", () => {
  it("fish/coral only accept fixed-list values (case-insensitive)", () => {
    expect(isValidSizeForSystem("fish", "medium")).toBe(true)
    expect(isValidSizeForSystem("fish", "Jumbo")).toBe(false)
    expect(isValidSizeForSystem("coral", "2½\"")).toBe(true)
    expect(isValidSizeForSystem("coral", "7\"")).toBe(false)
  })

  it("supply accepts any non-empty custom label", () => {
    expect(isValidSizeForSystem("supply", "100 ml")).toBe(true)
    expect(isValidSizeForSystem("supply", "   ")).toBe(false)
  })

  it("canonicalFixedSize returns the display-cased label", () => {
    expect(canonicalFixedSize("fish", "small–medium")).toBe("Small–Medium")
    expect(canonicalFixedSize("coral", "colony")).toBe("Colony")
  })

  it("fish/coral order by canonical rank; supply keeps staff order verbatim", () => {
    expect(orderSizeValues("fish", ["Show", "Tiny", "Medium"])).toEqual([
      "Tiny",
      "Medium",
      "Show",
    ])
    expect(orderSizeValues("coral", ["Colony", "1\"", "½\""])).toEqual([
      "½\"",
      "1\"",
      "Colony",
    ])
    expect(orderSizeValues("supply", ["36\"", "1 lb", "25 count"])).toEqual([
      "36\"",
      "1 lb",
      "25 count",
    ])
  })
})
