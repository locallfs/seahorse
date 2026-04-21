import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../modules/auctions"

const PAY_WINDOW_MS = 24 * 60 * 60 * 1000

export default async function closeAuctions(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const auctionsModule: any = container.resolve(AUCTIONS_MODULE)
  const productModule: any = container.resolve(Modules.PRODUCT)
  const customerModule: any = container.resolve(Modules.CUSTOMER)
  const notificationModule: any = container.resolve(Modules.NOTIFICATION)

  const now = new Date()
  const liveAuctions: any[] = await auctionsModule.listAuctions(
    { status: "live" },
    { relations: ["bids"], take: 500 }
  )

  let closed = 0

  for (const auction of liveAuctions) {
    const endsMs = new Date(auction.ends_at).getTime()
    if (endsMs > now.getTime()) continue

    const winningBid = (auction.bids || []).find(
      (b: any) => b.status === "winning"
    )

    const reserveMet =
      auction.reserve_price == null ||
      (winningBid && winningBid.amount >= auction.reserve_price)

    if (!winningBid || !reserveMet) {
      await auctionsModule.updateAuctions({
        id: auction.id,
        status: "ended",
      })
      closed++
      logger.info(
        `[close-auctions] ${auction.id} ended with no winner (bids=${
          (auction.bids || []).length
        }, reserve_met=${reserveMet})`
      )
      continue
    }

    const payDeadline = new Date(now.getTime() + PAY_WINDOW_MS)

    await auctionsModule.updateAuctions({
      id: auction.id,
      status: "ended",
      winner_customer_id: winningBid.customer_id,
      winner_offer_status: "pending_payment",
      winner_offer_expires_at: payDeadline,
    })
    closed++

    try {
      const [customer] = await customerModule.listCustomers({
        id: winningBid.customer_id,
      })
      const [product] = auction.product_id
        ? await productModule.listProducts({ id: auction.product_id })
        : [null]

      if (customer?.email) {
        const storefrontUrl =
          process.env.STOREFRONT_URL ||
          process.env.NEXT_PUBLIC_BASE_URL ||
          "https://www.seahorse-nw.com"
        const payUrl = `${storefrontUrl}/auctions/${auction.id}/pay`

        await notificationModule.createNotifications({
          to: customer.email,
          channel: "email",
          template: "auction-won",
          data: {
            first_name: customer.first_name || "",
            product_title: product?.title || "your item",
            amount_cents: winningBid.amount,
            amount_display: (winningBid.amount / 100).toFixed(2),
            pay_url: payUrl,
            pay_deadline: payDeadline.toISOString(),
            company_name: "Woody's Seahorse Aquarium & Supply",
          },
        })
        logger.info(
          `[close-auctions] auction-won fired for ${customer.email} (auction ${auction.id})`
        )
      }
    } catch (err: any) {
      logger.error(
        `[close-auctions] winner notify failed for ${auction.id}: ${
          err?.message || err
        }`
      )
    }
  }

  logger.info(
    `[close-auctions] scanned ${liveAuctions.length} live, closed ${closed}`
  )
}

export const config = {
  name: "close-auctions",
  schedule: "* * * * *",
}
