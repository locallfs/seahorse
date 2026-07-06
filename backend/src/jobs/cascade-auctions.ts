import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../modules/auctions"

const PAY_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_CASCADES = 3

export default async function cascadeAuctions(container: MedusaContainer) {
  // Auctions are retired for now. Re-enable by setting AUCTIONS_ENABLED=true.
  if (process.env.AUCTIONS_ENABLED !== "true") return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const auctionsModule: any = container.resolve(AUCTIONS_MODULE)
  const productModule: any = container.resolve(Modules.PRODUCT)
  const customerModule: any = container.resolve(Modules.CUSTOMER)
  const notificationModule: any = container.resolve(Modules.NOTIFICATION)

  const now = new Date()
  const storefrontUrl =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.seahorse-nw.com"

  const pending: any[] = await auctionsModule.listAuctions(
    {
      status: "ended",
      winner_offer_status: "pending_payment",
    },
    { relations: ["bids"], take: 500 }
  )

  let processed = 0

  for (const auction of pending) {
    const deadlineMs = auction.winner_offer_expires_at
      ? new Date(auction.winner_offer_expires_at).getTime()
      : 0
    if (!deadlineMs || deadlineMs > now.getTime()) continue

    const forfeitingCustomerId = auction.winner_customer_id as string | null
    if (!forfeitingCustomerId) continue

    const currentWinningBid = (auction.bids || []).find(
      (b: any) =>
        b.status === "winning" && b.customer_id === forfeitingCustomerId
    )
    if (currentWinningBid) {
      await auctionsModule.updateBids({
        id: currentWinningBid.id,
        status: "forfeited",
      })
    }

    let justBanned = false
    try {
      const [forfeiter] = await customerModule.listCustomers({
        id: forfeitingCustomerId,
      })
      if (forfeiter) {
        const ghostCount =
          Number(forfeiter.metadata?.auction_ghost_count || 0) + 1
        const metaUpdates: any = {
          ...(forfeiter.metadata || {}),
          auction_ghost_count: ghostCount,
          last_ghost_at: now.toISOString(),
        }
        if (ghostCount >= 2) {
          metaUpdates.auction_banned = true
          metaUpdates.auction_banned_at = now.toISOString()
          justBanned = true
        }
        await customerModule.updateCustomers(forfeitingCustomerId, {
          metadata: metaUpdates,
        })

        if (forfeiter.email) {
          await notificationModule.createNotifications({
            to: forfeiter.email,
            channel: "email",
            template: justBanned ? "auction-banned" : "auction-forfeit-warning",
            data: {
              first_name: forfeiter.first_name || "",
              ghost_count: ghostCount,
              company_name: "Woody's Seahorse Aquarium & Supply",
            },
          })
        }
      }
    } catch (err: any) {
      logger.error(
        `[cascade-auctions] ghost update failed for ${forfeitingCustomerId}: ${
          err?.message || err
        }`
      )
    }

    const cascadePosition = (auction.cascade_position || 0) + 1
    let nextWinner: any = null
    if (cascadePosition <= MAX_CASCADES) {
      const eligible = [...(auction.bids || [])]
        .filter((b: any) => b.customer_id !== forfeitingCustomerId)
        .filter(
          (b: any) => b.status === "outbid" || b.status === "active"
        )
        .sort((a: any, b: any) => b.amount - a.amount)

      const seen = new Set<string>()
      for (const bid of eligible) {
        if (seen.has(bid.customer_id)) continue
        seen.add(bid.customer_id)
        nextWinner = bid
        break
      }
    }

    if (!nextWinner) {
      await auctionsModule.updateAuctions({
        id: auction.id,
        winner_offer_status: "forfeited",
        cascade_position: cascadePosition,
      })
      processed++
      logger.info(
        `[cascade-auctions] ${auction.id} fully forfeited (no more bidders)`
      )
      continue
    }

    await auctionsModule.updateBids({
      id: nextWinner.id,
      status: "winning",
    })

    const newDeadline = new Date(now.getTime() + PAY_WINDOW_MS)
    await auctionsModule.updateAuctions({
      id: auction.id,
      winner_customer_id: nextWinner.customer_id,
      winner_offer_status: "pending_payment",
      winner_offer_expires_at: newDeadline,
      current_high_bid_id: nextWinner.id,
      cascade_position: cascadePosition,
      metadata: {
        ...(auction.metadata || {}),
        current_high_bid_amount: nextWinner.amount,
      },
    })
    processed++

    try {
      const [customer] = await customerModule.listCustomers({
        id: nextWinner.customer_id,
      })
      const [product] = auction.product_id
        ? await productModule.listProducts({ id: auction.product_id })
        : [null]
      if (customer?.email) {
        const payUrl = `${storefrontUrl}/auctions/${auction.id}/pay`
        await notificationModule.createNotifications({
          to: customer.email,
          channel: "email",
          template: "auction-cascaded-to-you",
          data: {
            first_name: customer.first_name || "",
            product_title: product?.title || "your item",
            amount_cents: nextWinner.amount,
            amount_display: (nextWinner.amount / 100).toFixed(2),
            pay_url: payUrl,
            pay_deadline: newDeadline.toISOString(),
            cascade_position: cascadePosition,
            company_name: "Woody's Seahorse Aquarium & Supply",
          },
        })
        logger.info(
          `[cascade-auctions] ${auction.id} cascaded to ${customer.email} at position ${cascadePosition}`
        )
      }
    } catch (err: any) {
      logger.error(
        `[cascade-auctions] cascade notify failed: ${err?.message || err}`
      )
    }
  }

  logger.info(
    `[cascade-auctions] processed ${processed} of ${pending.length} pending-payment auctions`
  )
}

export const config = {
  name: "cascade-auctions",
  schedule: "* * * * *",
}
