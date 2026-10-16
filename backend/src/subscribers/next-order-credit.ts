/* eslint-disable @typescript-eslint/no-explicit-any */
// "$50 off your next order on live orders over $500."
// On every placed order:
//   1. Any credit promotion this order redeemed is revoked (one-time use).
//   2. If the order's LIVE fish & coral subtotal (after discounts, before
//      shipping/tax) is over $500, the customer earns a fresh credit — a
//      customer-locked, auto-applying $50 promotion that attaches itself to
//      their next cart. No shared code exists, so nobody can use it without
//      ordering first.
// Supplies never count toward the threshold; live classification comes from
// category/tag/metadata, never product titles.

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
import {
  liveClassificationSql,
  liveSubtotal,
  rowToClassification,
  type LiveClassification,
} from "../lib/live-items"

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

    // Per-line gross and discounts, so the live subtotal can be computed from
    // only the live lines rather than the whole order.
    const lines: Array<{ product_id: string | null; gross: number; discounts: number }> = []
    const usedCreditIds: string[] = []
    for (const item of order?.items ?? []) {
      let discounts = 0
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
      lines.push({
        product_id: item?.product_id ? String(item.product_id) : null,
        gross: Number(item?.unit_price ?? 0) * Number(item?.quantity ?? 0),
        discounts,
      })
    }

    const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Classify each product as live fish/coral from stable data.
    const productIds = [...new Set(lines.map((l) => l.product_id).filter(Boolean))] as string[]
    const classifications = new Map<string, LiveClassification>()
    if (productIds.length) {
      const res = await pg.raw(liveClassificationSql(productIds.length), productIds)
      for (const row of res?.rows || []) {
        classifications.set(String(row.id), rowToClassification(row))
      }
    }
    const { liveSubtotal: liveTotal, otherSubtotal, hasLive } = liveSubtotal(
      lines,
      classifications,
    )
    console.log(
      `[next-order-credit] live=$${liveTotal} other=$${otherSubtotal} hasLive=${hasLive}`
    )
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
      live_total: liveTotal,
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
        `[next-order-credit] granted $50 next-order credit ${code} to customer=${customerId} (${decision.reason})`
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
