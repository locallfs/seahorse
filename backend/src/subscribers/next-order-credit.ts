/* eslint-disable @typescript-eslint/no-explicit-any */
// "$20 off your next order if you spend $250 or more."
// On every placed order:
//   1. Any credit promotion this order redeemed is revoked (one-time use).
//   2. If the order's item total (after discounts, before shipping/tax) is
//      $250+, the customer earns a fresh credit — a customer-locked,
//      auto-applying $20 promotion that attaches itself to their next cart.
//      No shared code exists, so nobody can use it without ordering first.

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import {
  createPromotionsWorkflow,
  updatePromotionsWorkflow,
} from "@medusajs/core-flows"
import { randomBytes } from "crypto"
import {
  CREDIT_CODE_PREFIX,
  creditPromotionPayload,
  decideNextOrderCredit,
} from "../lib/next-order-credit"

export default async function nextOrderCreditHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event?.data?.id
  console.log(`[next-order-credit] start order=${orderId}`)
  try {
    const orderModule: any = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "items.adjustments"],
    })
    const customerId: string | null = order?.customer_id ?? null

    // Item total after discounts: gross line totals minus all adjustments.
    let gross = 0
    let discounts = 0
    const usedCreditIds: string[] = []
    for (const item of order?.items ?? []) {
      gross += Number(item?.unit_price ?? 0) * Number(item?.quantity ?? 0)
      for (const adj of item?.adjustments ?? []) {
        discounts += Number(adj?.amount ?? 0)
        if (
          typeof adj?.code === "string" &&
          adj.code.startsWith(CREDIT_CODE_PREFIX) &&
          adj?.promotion_id
        ) {
          usedCreditIds.push(String(adj.promotion_id))
        }
      }
    }
    const itemTotal = gross - discounts

    // The customer's still-active credits (customer-locked by rule value).
    const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    let activeCreditIds: string[] = []
    if (customerId) {
      const res = await pg.raw(
        `select distinct p.id
           from promotion p
           join promotion_promotion_rule ppr on ppr.promotion_id = p.id
           join promotion_rule r on r.id = ppr.promotion_rule_id and r.deleted_at is null
           join promotion_rule_value v on v.promotion_rule_id = r.id and v.deleted_at is null
          where p.deleted_at is null and p.status = 'active'
            and p.code like ? and r.attribute = 'customer.id' and v.value = ?`,
        [`${CREDIT_CODE_PREFIX}%`, customerId]
      )
      activeCreditIds = (res?.rows || []).map((r: any) => String(r.id))
    }

    const decision = decideNextOrderCredit({
      customer_id: customerId,
      item_total: itemTotal,
      used_credit_promotion_ids: usedCreditIds,
      active_credit_promotion_ids: activeCreditIds,
    })

    if (decision.revoke_promotion_ids.length > 0) {
      await updatePromotionsWorkflow(container).run({
        input: {
          promotionsData: decision.revoke_promotion_ids.map((id) => ({
            id,
            status: "inactive" as const,
          })),
        },
      })
      console.log(
        `[next-order-credit] revoked redeemed credit(s): ${decision.revoke_promotion_ids.join(", ")}`
      )
    }

    if (decision.grant && customerId) {
      const code = `${CREDIT_CODE_PREFIX}${randomBytes(5).toString("hex").toUpperCase()}`
      await createPromotionsWorkflow(container).run({
        input: { promotionsData: [creditPromotionPayload(customerId, code)] },
      })
      console.log(
        `[next-order-credit] granted $20 next-order credit ${code} to customer=${customerId} (${decision.reason})`
      )
    } else {
      console.log(`[next-order-credit] no grant: ${decision.reason}`)
    }
    console.log(`[next-order-credit] end order=${orderId}`)
  } catch (err: any) {
    // Never block order placement over the credit — log loudly instead.
    console.error(
      `[next-order-credit] FAILED for order=${orderId}: ${err?.message || err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
