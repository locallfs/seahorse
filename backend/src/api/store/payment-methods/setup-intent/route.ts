import { getStripe, getOrCreateStripeCustomer } from "../../../../lib/stripe"

export async function POST(req: any, res: any) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const intent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
    })
    res.json({
      client_secret: intent.client_secret,
      stripe_customer_id: stripeCustomerId,
    })
  } catch (err: any) {
    console.error(
      `[store/payment-methods/setup-intent] failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Failed to start setup" })
  }
}
