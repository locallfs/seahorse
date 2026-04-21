import { Modules } from "@medusajs/utils"

export async function GET(req: any, res: any) {
  const customerId = req.params?.id
  if (!customerId) {
    res.status(400).json({ error: "Missing customer id" })
    return
  }
  try {
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER)
    const [customer] = await customerModule.listCustomers({ id: customerId })
    if (!customer) {
      res.status(404).json({ error: "Customer not found" })
      return
    }
    const meta = customer.metadata || {}
    res.json({
      ghost_count: Number(meta.auction_ghost_count || 0),
      last_ghost_at: meta.last_ghost_at || null,
      banned: !!meta.auction_banned,
      banned_at: meta.auction_banned_at || null,
    })
  } catch (err: any) {
    console.error(
      `[admin/customers/:id/auction-status] get failed: ${
        err?.message || err
      }`
    )
    res
      .status(500)
      .json({ error: err?.message || "Failed to load auction status" })
  }
}

export async function POST(req: any, res: any) {
  const customerId = req.params?.id
  const { banned, reset_ghost_count } = req.body ?? {}
  if (!customerId) {
    res.status(400).json({ error: "Missing customer id" })
    return
  }
  try {
    const customerModule: any = req.scope.resolve(Modules.CUSTOMER)
    const [customer] = await customerModule.listCustomers({ id: customerId })
    if (!customer) {
      res.status(404).json({ error: "Customer not found" })
      return
    }
    const meta = { ...(customer.metadata || {}) } as Record<string, any>
    if (typeof banned === "boolean") {
      meta.auction_banned = banned
      if (!banned) {
        delete meta.auction_banned_at
      } else {
        meta.auction_banned_at = new Date().toISOString()
      }
    }
    if (reset_ghost_count === true) {
      meta.auction_ghost_count = 0
      delete meta.last_ghost_at
    }
    await customerModule.updateCustomers(customerId, { metadata: meta })
    res.json({
      ghost_count: Number(meta.auction_ghost_count || 0),
      last_ghost_at: meta.last_ghost_at || null,
      banned: !!meta.auction_banned,
      banned_at: meta.auction_banned_at || null,
    })
  } catch (err: any) {
    console.error(
      `[admin/customers/:id/auction-status] update failed: ${
        err?.message || err
      }`
    )
    res.status(500).json({ error: err?.message || "Failed to update" })
  }
}
