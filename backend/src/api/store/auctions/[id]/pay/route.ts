import { Modules } from "@medusajs/utils"
import { AUCTIONS_MODULE } from "../../../../../modules/auctions"
import { getStripe, getOrCreateStripeCustomer } from "../../../../../lib/stripe"

export async function GET(req: any, res: any) {
  const auctionId = req.params?.id
  const customerId = req.auth_context?.actor_id
  console.log(`[store/auctions/:id/pay:GET] ${auctionId} by ${customerId}`)

  if (!customerId) {
    res.status(401).json({ error: "Sign in to view this invoice" })
    return
  }
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }

  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)

    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }
    if (auction.winner_customer_id !== customerId) {
      res.status(403).json({ error: "You are not the winner of this auction" })
      return
    }

    const winningBid = (auction.bids || []).find(
      (b: any) => b.status === "winning"
    )
    const [product] = auction.product_id
      ? await productModule.listProducts({ id: auction.product_id })
      : [null]

    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const stripeCustomer: any = await stripe.customers.retrieve(stripeCustomerId)
    const defaultPmId =
      stripeCustomer.invoice_settings?.default_payment_method ?? null
    let card: any = null
    if (defaultPmId) {
      const pm = await stripe.paymentMethods.retrieve(defaultPmId)
      card = {
        brand: pm.card?.brand,
        last4: pm.card?.last4,
      }
    } else {
      const methods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
        limit: 1,
      })
      if (methods.data[0]) {
        card = {
          brand: methods.data[0].card?.brand,
          last4: methods.data[0].card?.last4,
        }
      }
    }

    res.json({
      auction: {
        id: auction.id,
        status: auction.status,
        winner_offer_status: auction.winner_offer_status,
        winner_offer_expires_at: auction.winner_offer_expires_at,
        amount: winningBid?.amount ?? 0,
        product: product
          ? {
              id: product.id,
              title: product.title,
              thumbnail: product.thumbnail,
            }
          : null,
      },
      card,
    })
  } catch (err: any) {
    console.error(
      `[store/auctions/:id/pay:GET] failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Failed to load invoice" })
  }
}

export async function POST(req: any, res: any) {
  const auctionId = req.params?.id
  const customerId = req.auth_context?.actor_id
  console.log(`[store/auctions/:id/pay:POST] ${auctionId} by ${customerId}`)

  if (!customerId) {
    res.status(401).json({ error: "Sign in to pay" })
    return
  }
  if (!auctionId) {
    res.status(400).json({ error: "Missing auction id" })
    return
  }

  try {
    const auctionsModule: any = req.scope.resolve(AUCTIONS_MODULE)

    const [auction] = await auctionsModule.listAuctions(
      { id: auctionId },
      { relations: ["bids"] }
    )
    if (!auction) {
      res.status(404).json({ error: "Auction not found" })
      return
    }
    if (auction.winner_customer_id !== customerId) {
      res.status(403).json({ error: "You are not the winner of this auction" })
      return
    }
    if (auction.winner_offer_status === "paid") {
      res.status(409).json({ error: "This auction is already paid" })
      return
    }
    if (
      auction.winner_offer_status === "forfeited" ||
      auction.winner_offer_status === "cascaded"
    ) {
      res.status(409).json({ error: "Payment window has closed" })
      return
    }
    const deadlineMs = auction.winner_offer_expires_at
      ? new Date(auction.winner_offer_expires_at).getTime()
      : 0
    if (deadlineMs && deadlineMs < Date.now()) {
      res.status(409).json({ error: "Payment window has expired" })
      return
    }

    const winningBid = (auction.bids || []).find(
      (b: any) => b.status === "winning"
    )
    if (!winningBid) {
      res.status(409).json({ error: "No winning bid found" })
      return
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const stripeCustomer: any = await stripe.customers.retrieve(stripeCustomerId)
    let pmId =
      stripeCustomer.invoice_settings?.default_payment_method ?? null
    if (!pmId) {
      const methods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
        limit: 1,
      })
      pmId = methods.data[0]?.id ?? null
    }
    if (!pmId) {
      res.status(402).json({
        error: "No card on file. Add a card to pay.",
        code: "no_card_on_file",
      })
      return
    }

    let intent: any
    try {
      intent = await stripe.paymentIntents.create({
        amount: winningBid.amount,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: pmId,
        off_session: true,
        confirm: true,
        description: `Auction ${auction.id}`,
        metadata: {
          auction_id: auction.id,
          bid_id: winningBid.id,
          medusa_customer_id: customerId,
        },
      })
    } catch (err: any) {
      const stripeErr = err?.raw || err
      const code = stripeErr?.code || stripeErr?.decline_code || "charge_failed"
      console.error(
        `[store/auctions/:id/pay:POST] stripe failure ${code}: ${
          stripeErr?.message || err?.message
        }`
      )
      res.status(402).json({
        error:
          stripeErr?.message ||
          "Card was declined. Update your card and try again.",
        code,
      })
      return
    }

    if (intent.status !== "succeeded") {
      res.status(402).json({
        error: `Payment not complete (${intent.status}). Update your card and try again.`,
        code: intent.status,
      })
      return
    }

    await auctionsModule.updateAuctions({
      id: auction.id,
      winner_offer_status: "paid",
      metadata: {
        ...(auction.metadata || {}),
        payment_intent_id: intent.id,
        paid_at: new Date().toISOString(),
      },
    })

    res.json({
      ok: true,
      payment_intent_id: intent.id,
      amount: winningBid.amount,
    })
  } catch (err: any) {
    console.error(
      `[store/auctions/:id/pay:POST] failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Payment failed" })
  }
}
