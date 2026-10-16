import { describe, it, expect } from "vitest"
import {
  CREDIT_AMOUNT,
  CREDIT_CODE_PREFIX,
  CREDIT_MIN_LIVE_TOTAL,
  creditPromotionPayload,
  decideNextOrderCredit,
} from "../next-order-credit"

const base = {
  customer_id: "cus_1",
  live_total: 600,
  used_credit_promotion_ids: [] as string[],
  active_credit_promotion_ids: [] as string[],
}

describe("earning the $50 next-order credit", () => {
  it("constants match the offer: $50 off, $500 live threshold, NEXT50- codes", () => {
    expect(CREDIT_AMOUNT).toBe(50)
    expect(CREDIT_MIN_LIVE_TOTAL).toBe(500)
    expect(CREDIT_CODE_PREFIX).toBe("NEXT50-")
  })

  it("the threshold is OVER $500, so exactly $500 earns nothing", () => {
    expect(decideNextOrderCredit({ ...base, live_total: 500.01 }).grant).toBe(true)
    expect(decideNextOrderCredit({ ...base, live_total: 500 }).grant).toBe(false)
    expect(decideNextOrderCredit({ ...base, live_total: 499.99 }).grant).toBe(false)
  })

  it("is measured on the LIVE subtotal — a supplies-only order earns nothing", () => {
    // The subscriber passes 0 when nothing in the cart is live.
    const d = decideNextOrderCredit({ ...base, live_total: 0 })
    expect(d.grant).toBe(false)
    expect(d.reason).toMatch(/live total/)
  })

  it("no customer on the order → no credit (accounts only, no shareable code)", () => {
    expect(decideNextOrderCredit({ ...base, customer_id: null }).grant).toBe(false)
  })

  it("never stacks: an unredeemed credit blocks earning another", () => {
    const d = decideNextOrderCredit({
      ...base,
      active_credit_promotion_ids: ["promo_active"],
    })
    expect(d.grant).toBe(false)
    expect(d.reason).toMatch(/unredeemed/)
  })

  it("rejects a non-finite total rather than granting on garbage", () => {
    // Both are refused: the finite check runs before the comparison, so a
    // corrupt total can never mint a credit just by being large.
    expect(decideNextOrderCredit({ ...base, live_total: NaN }).grant).toBe(false)
    expect(decideNextOrderCredit({ ...base, live_total: Infinity }).grant).toBe(false)
  })
})

describe("redeeming is one-time", () => {
  it("a redeemed credit is revoked by the order that used it", () => {
    const d = decideNextOrderCredit({
      ...base,
      live_total: 100,
      used_credit_promotion_ids: ["promo_used"],
    })
    expect(d.revoke_promotion_ids).toEqual(["promo_used"])
    expect(d.grant).toBe(false)
  })

  it("an order that redeems a credit AND still has over $500 live earns the next one", () => {
    const d = decideNextOrderCredit({
      ...base,
      live_total: 560, // after the $50 discount
      used_credit_promotion_ids: ["promo_used"],
      active_credit_promotion_ids: ["promo_used"], // same promo, being revoked
    })
    expect(d.revoke_promotion_ids).toEqual(["promo_used"])
    expect(d.grant).toBe(true)
  })

  it("deduplicates a credit that somehow appears on two lines", () => {
    const d = decideNextOrderCredit({
      ...base,
      used_credit_promotion_ids: ["promo_used", "promo_used"],
    })
    expect(d.revoke_promotion_ids).toEqual(["promo_used"])
  })
})

describe("the credit promotion itself", () => {
  it("is a $50 fixed order discount, automatic, locked to exactly one customer", () => {
    const p = creditPromotionPayload("cus_1", "NEXT50-ABC123")
    expect(p).toMatchObject({
      code: "NEXT50-ABC123",
      type: "standard",
      status: "active",
      is_automatic: true,
      application_method: {
        type: "fixed",
        target_type: "order",
        value: 50,
        currency_code: "usd",
      },
    })
    expect(p.rules).toEqual([
      { attribute: "customer.id", operator: "in", values: ["cus_1"] },
    ])
  })

  it("carries no shareable public code beyond the customer lock", () => {
    const p = creditPromotionPayload("cus_1", "NEXT50-ABC123")
    // is_automatic + a customer.id rule is what stops the code being passed around.
    expect(p.is_automatic).toBe(true)
    expect(p.rules?.[0]?.attribute).toBe("customer.id")
  })
})
