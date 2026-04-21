import Stripe from "stripe"
import { Modules } from "@medusajs/utils"

type StripeClient = Stripe.Stripe

let cached: StripeClient | null = null

export function getStripe(): StripeClient {
  if (cached) return cached
  const key = process.env.STRIPE_API_KEY
  if (!key) throw new Error("STRIPE_API_KEY is not set")
  cached = new Stripe(key, { apiVersion: "2024-06-20" as any })
  return cached
}

export async function getOrCreateStripeCustomer(
  container: any,
  customerId: string
): Promise<string> {
  const customerModule: any = container.resolve(Modules.CUSTOMER)
  const [customer] = await customerModule.listCustomers({ id: customerId })
  if (!customer) throw new Error(`Customer ${customerId} not found`)
  const existing = customer.metadata?.stripe_customer_id as string | undefined
  if (existing) return existing

  const stripe = getStripe()
  const created = await stripe.customers.create({
    email: customer.email ?? undefined,
    name:
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      undefined,
    metadata: { medusa_customer_id: customer.id },
  })

  await customerModule.updateCustomers(customer.id, {
    metadata: {
      ...(customer.metadata || {}),
      stripe_customer_id: created.id,
    },
  })

  return created.id
}
