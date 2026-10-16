// Pure decision core for "$50 off your next order on live orders over $500".
//
// LIVE only: the threshold is measured on live fish & coral merchandise, so a
// $600 cart of salt and equipment earns nothing. Live classification comes from
// category/tag/metadata (see lib/live-items.ts), never from product titles.
//
// Earned per customer by a qualifying order — never a shared public code. The
// credit is a customer-locked, auto-applying Medusa promotion: it applies
// itself to that customer's next cart and is revoked the moment an order
// redeems it, so it can only ever be used once.

export const CREDIT_CODE_PREFIX = "NEXT50-"
export const CREDIT_AMOUNT = 50
// "Over $500" of LIVE merchandise the customer actually pays for, after
// discounts and before shipping and tax. Strictly greater than.
export const CREDIT_MIN_LIVE_TOTAL = 500

export type CreditDecision = {
  /** Credit promotions redeemed by THIS order — deactivate them (one-time use). */
  revoke_promotion_ids: string[]
  /** Create a fresh credit for this customer. */
  grant: boolean
  reason: string
}

export function decideNextOrderCredit(args: {
  customer_id: string | null
  /** LIVE fish & coral subtotal after discounts, before shipping/tax, in dollars. */
  live_total: number
  /** Credit-promotion ids that were applied on this order. */
  used_credit_promotion_ids: string[]
  /** The customer's still-active (unredeemed) credit-promotion ids. */
  active_credit_promotion_ids: string[]
}): CreditDecision {
  const {
    customer_id,
    live_total,
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
  // "Over $500" — strictly greater than, so exactly $500 does not qualify.
  if (!(Number.isFinite(live_total) && live_total > CREDIT_MIN_LIVE_TOTAL)) {
    return {
      revoke_promotion_ids: revoke,
      grant: false,
      reason: `live total $${live_total} does not exceed the $${CREDIT_MIN_LIVE_TOTAL} threshold`,
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
    reason: `live total $${live_total} exceeds the $${CREDIT_MIN_LIVE_TOTAL} threshold`,
  }
}

/**
 * The Medusa promotion payload for one credit: $50 fixed off the order,
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
