import { describe, it, expect } from "vitest"
import {
  CREDIT_AMOUNT,
  CREDIT_CODE_PREFIX,
  CREDIT_MIN_ITEM_TOTAL,
  creditPromotionPayload,
  decideNextOrderCredit,
} from "../next-order-credit"

const base = {
  customer_id: "cus_1",
  item_total: 300,
  used_credit_promotion_ids: [] as string[],
  active_credit_promotion_ids: [] as string[],
}

describe("earning the $20 next-order credit", () => {
  it("constants match the offer: $20 off, $250 threshold, NEXT20- codes", () => {
    expect(CREDIT_AMOUNT).toBe(20)
    expect(CREDIT_MIN_ITEM_TOTAL).toBe(250)
    expect(CREDIT_CODE_PREFIX).toBe("NEXT20-")
  })

  it("a $250+ order earns a credit; below the threshold earns nothing", () => {
    expect(decideNextOrderCredit({ ...base, item_total: 250 }).grant).toBe(true)
    expect(decideNextOrderCredit({ ...base, item_total: 249.99 }).grant).toBe(false)
  })

  it("no customer on the order → no credit (accounts only, no shareable code)", () => {
    expect(
      decideNextOrderCredit({ ...base, customer_id: null }).grant
    ).toBe(false)
  })

  it("never stacks: an unredeemed credit blocks earning another", () => {
    const d = decideNextOrderCredit({
      ...base,
      active_credit_promotion_ids: ["promo_active"],
    })
    expect(d.grant).toBe(false)
    expect(d.reason).toMatch(/unredeemed/)
  })
})

describe("redeeming is one-time", () => {
  it("a redeemed credit is revoked by the order that used it", () => {
    const d = decideNextOrderCredit({
      ...base,
      item_total: 100,
      used_credit_promotion_ids: ["promo_used"],
    })
    expect(d.revoke_promotion_ids).toEqual(["promo_used"])
    expect(d.grant).toBe(false)
  })

  it("an order that redeems a credit AND still totals $250+ earns the next one", () => {
    const d = decideNextOrderCredit({
      ...base,
      item_total: 260, // after the $20 discount
      used_credit_promotion_ids: ["promo_used"],
      active_credit_promotion_ids: ["promo_used"], // same promo, being revoked
    })
    expect(d.revoke_promotion_ids).toEqual(["promo_used"])
    expect(d.grant).toBe(true)
  })
})

describe("the credit promotion itself", () => {
  it("is a $20 fixed order discount, automatic, locked to exactly one customer", () => {
    const p = creditPromotionPayload("cus_1", "NEXT20-ABC123")
    expect(p).toMatchObject({
      code: "NEXT20-ABC123",
      type: "standard",
      status: "active",
      is_automatic: true,
      application_method: {
        type: "fixed",
        target_type: "order",
        value: 20,
        currency_code: "usd",
      },
    })
    expect(p.rules).toEqual([
      { attribute: "customer.id", operator: "in", values: ["cus_1"] },
    ])
  })
})
