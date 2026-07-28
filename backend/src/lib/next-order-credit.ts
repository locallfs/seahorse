// Pure decision core for the "$20 off your next order if you spend $250 or
// more" credit. Earned per customer by a qualifying order — never a shared
// public code. The credit is a customer-locked, auto-applying Medusa
// promotion: it applies itself to that customer's next cart and is revoked
// the moment an order redeems it, so it can only ever be used once.

export const CREDIT_CODE_PREFIX = "NEXT20-"
export const CREDIT_AMOUNT = 20
// "Spend $250" = merchandise total the customer actually pays for items
// (after discounts, before shipping and tax).
export const CREDIT_MIN_ITEM_TOTAL = 250

export type CreditDecision = {
  /** Credit promotions redeemed by THIS order — deactivate them (one-time use). */
  revoke_promotion_ids: string[]
  /** Create a fresh credit for this customer. */
  grant: boolean
  reason: string
}

export function decideNextOrderCredit(args: {
  customer_id: string | null
  /** Item total after discounts, before shipping/tax, in dollars. */
  item_total: number
  /** Credit-promotion ids that were applied on this order. */
  used_credit_promotion_ids: string[]
  /** The customer's still-active (unredeemed) credit-promotion ids. */
  active_credit_promotion_ids: string[]
}): CreditDecision {
  const {
    customer_id,
    item_total,
    used_credit_promotion_ids,
    active_credit_promotion_ids,
  } = args

  // A redeemed credit is revoked no matter what else happens.
  const revoke = [...new Set(used_credit_promotion_ids)]

  if (!customer_id) {
    return {
      revoke_promotion_ids: revoke,
      grant: false,
      reason: "no customer on the order — credits are earned by accounts only",
    }
  }
  if (!(Number.isFinite(item_total) && item_total >= CREDIT_MIN_ITEM_TOTAL)) {
    return {
      revoke_promotion_ids: revoke,
      grant: false,
      reason: `item total $${item_total} is below the $${CREDIT_MIN_ITEM_TOTAL} threshold`,
    }
  }
  // Never stack: one unredeemed credit per customer at a time. Credits the
  // order just redeemed don't count — those are being revoked.
  const stillActive = active_credit_promotion_ids.filter(
    (id) => !revoke.includes(id)
  )
  if (stillActive.length > 0) {
    return {
      revoke_promotion_ids: revoke,
      grant: false,
      reason: "customer already has an unredeemed credit",
    }
  }
  return {
    revoke_promotion_ids: revoke,
    grant: true,
    reason: `item total $${item_total} meets the $${CREDIT_MIN_ITEM_TOTAL} threshold`,
  }
}

/**
 * The Medusa promotion payload for one credit: $20 fixed off the order,
 * automatic (no code entry needed), locked to exactly one customer by rule.
 */
export function creditPromotionPayload(customerId: string, code: string) {
  return {
    code,
    type: "standard" as const,
    status: "active" as const,
    is_automatic: true,
    application_method: {
      type: "fixed" as const,
      target_type: "order" as const,
      value: CREDIT_AMOUNT,
      currency_code: "usd",
    },
    rules: [
      {
        attribute: "customer.id",
        operator: "in" as const,
        values: [customerId],
      },
    ],
  }
}
