import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../../../modules/auctions"
import { getStripe, getOrCreateStripeCustomer } from "../../../../../lib/stripe"

export async function POST(req: any, res: any) {
  const auctionId = req.params?.id
  const customerId = req.auth_context?.actor_id
  console.log(`[store/auctions/:id/bids] ${auctionId} by ${customerId}`)

  if (!customerId) {
    res.status(401).json({ error: "Sign in to bid" })
    return
  }
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }

  const amountRaw = req.body?.amount
  const amount = Number(amountRaw)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "amount must be a positive integer (cents)" })
    return
  }

  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER)

    const [customer] = await customerModule.listCustomers({ id: customerId })
    if (!customer) {
      res.status(401).json({ error: "Customer not found" })
      return
    }
    if (customer.metadata?.auction_banned) {
      res.status(403).json({
        error: "You are not eligible to bid on auctions.",
      })
      return
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const stripeCustomer: any = await stripe.customers.retrieve(stripeCustomerId)
    const defaultPm =
      stripeCustomer.invoice_settings?.default_payment_method ?? null
    if (!defaultPm) {
      const methods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
        limit: 1,
      })
      if (methods.data.length === 0) {
        res.status(402).json({
          error: "Save a card on file before bidding",
          code: "no_card_on_file",
        })
        return
      }
    }

    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }

    const now = Date.now()
    const startsMs = new Date(auction.starts_at).getTime()
    const endsMs = new Date(auction.ends_at).getTime()
    if (auction.status === "cancelled") {
      res.status(409).json({ error: "Auction was cancelled" })
      return
    }
    if (auction.status === "ended" || now >= endsMs) {
      res.status(409).json({ error: "Auction has ended" })
      return
    }
    if (startsMs > now) {
      res.status(409).json({ error: "Auction has not started yet" })
      return
    }

    const existingBids = (auction.bids || []) as any[]
    const currentHigh = existingBids.find((b) => b.status === "winning")
    const minNext = currentHigh
      ? currentHigh.amount + auction.bid_increment
      : auction.starting_bid
    if (amount < minNext) {
      res.status(400).json({
        error: `Minimum next bid is ${minNext}`,
        min_next_bid: minNext,
      })
      return
    }

    if (currentHigh) {
      await auctionsModule.updateBids({ id: currentHigh.id, status: "outbid" })

      if (currentHigh.customer_id !== customerId) {
        try {
          const notificationModule: any = req.scope.resolve(
            Modules.NOTIFICATION
          )
          const productModule: any = req.scope.resolve(Modules.PRODUCT)
          const [outbid] = await customerModule.listCustomers({
            id: currentHigh.customer_id,
          })
          const [product] = auction.product_id
            ? await productModule.listProducts({ id: auction.product_id })
            : [null]
          if (outbid?.email) {
            const storefrontUrl =
              process.env.STOREFRONT_URL ||
              process.env.NEXT_PUBLIC_BASE_URL ||
              "https://www.seahorse-nw.com"
            await notificationModule.createNotifications({
              to: outbid.email,
              channel: "email",
              template: "auction-outbid",
              data: {
                first_name: outbid.first_name || "",
                product_title: product?.title || "an item",
                new_high_bid_cents: amount,
                new_high_bid_display: (amount / 100).toFixed(2),
                your_bid_cents: currentHigh.amount,
                your_bid_display: (currentHigh.amount / 100).toFixed(2),
                auction_url: `${storefrontUrl}/auctions/${auction.id}`,
                company_name: "Woody's Seahorse Aquarium & Supply",
              },
            })
          }
        } catch (err: any) {
          console.error(
            `[store/auctions/:id/bids] outbid notify failed: ${
              err?.message || err
            }`
          )
        }
      }
    }
    const [newBid] = await auctionsModule.createBids([
      {
        auction_id: auction.id,
        customer_id: customerId,
        amount,
        status: "winning",
      },
    ])

    const reserveMet =
      auction.reserve_price != null ? amount >= auction.reserve_price : true

    await auctionsModule.updateAuctions({
      id: auction.id,
      current_high_bid_id: newBid.id,
      reserve_met: reserveMet,
      status: "live",
      metadata: {
        ...(auction.metadata || {}),
        current_high_bid_amount: amount,
      },
    })

    const updated = await auctionsModule.extendIfSoftClose(
      auction.id,
      new Date()
    )

    res.status(201).json({
      bid: {
        id: newBid.id,
        amount: newBid.amount,
        status: newBid.status,
      },
      auction: {
        id: updated.id,
        ends_at: updated.ends_at,
        current_high_bid_amount: amount,
        min_next_bid: amount + updated.bid_increment,
      },
    })
  } catch (err: any) {
    console.error(
      `[store/auctions/:id/bids] failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Failed to place bid" })
  }
}
