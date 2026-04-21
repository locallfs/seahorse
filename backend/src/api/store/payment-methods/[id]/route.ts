import { getStripe, getOrCreateStripeCustomer } from "../../../../lib/stripe"

export async function DELETE(req: any, res: any) {
  const customerId = req.auth_context?.actor_id
  const methodId = req.params?.id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  if (!methodId) {
    res.status(400).json({ error: "Missing payment method id" })
    return
  }
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const method = await stripe.paymentMethods.retrieve(methodId)
    if (method.customer !== stripeCustomerId) {
      res.status(403).json({ error: "Card does not belong to this customer" })
      return
    }
    await stripe.paymentMethods.detach(methodId)
    res.json({ ok: true })
  } catch (err: any) {
    console.error(
      `[store/payment-methods/:id] delete failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Failed to remove card" })
  }
}
