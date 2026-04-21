import { getStripe, getOrCreateStripeCustomer } from "../../../lib/stripe"

export async function GET(req: any, res: any) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(req.scope, customerId)
    const stripe = getStripe()
    const [methods, customer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
      }),
      stripe.customers.retrieve(stripeCustomerId),
    ])
    const defaultId =
      (customer as any).invoice_settings?.default_payment_method ?? null
    res.json({
      payment_methods: methods.data.map((m) => ({
        id: m.id,
        brand: m.card?.brand,
        last4: m.card?.last4,
        exp_month: m.card?.exp_month,
        exp_year: m.card?.exp_year,
        is_default: m.id === defaultId,
      })),
    })
  } catch (err: any) {
    console.error(`[store/payment-methods] list failed: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to list cards" })
  }
}
