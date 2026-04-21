import { getStripe, getOrCreateStripeCustomer } from "../../../../lib/stripe"

export async function POST(req: any, res: any) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const { payment_method_id } = req.body ?? {}
  if (!payment_method_id) {
    res.status(400).json({ error: "payment_method_id is required" })
    return
  }
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(
      req.scope,
      customerId
    )
    const stripe = getStripe()
    const method = await stripe.paymentMethods.retrieve(payment_method_id)
    if (method.customer !== stripeCustomerId) {
      res.status(403).json({ error: "Card does not belong to this customer" })
      return
    }
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: payment_method_id },
    })
    res.json({ ok: true })
  } catch (err: any) {
    console.error(
      `[store/payment-methods/default] failed: ${err?.message || err}`
    )
    res.status(500).json({ error: err?.message || "Failed to set default" })
  }
}
