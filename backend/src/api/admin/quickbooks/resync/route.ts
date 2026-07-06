/* eslint-disable @typescript-eslint/no-explicit-any */
import { seedInventoryItems } from "../../../../modules/quickbooks/seed-core"

// Admin "Resync all" — (re)creates any missing QBO Inventory items with current
// Medusa stock. Idempotent.
export async function POST(req: any, res: any) {
  console.log("[admin/quickbooks/resync] start")
  try {
    const result = await seedInventoryItems(req.scope)
    console.log("[admin/quickbooks/resync] end", result)
    res.json({ ok: true, result })
  } catch (err: any) {
    console.error("[admin/quickbooks/resync] error", err?.message || err)
    res.status(500).json({ error: err?.message || "Resync failed" })
  }
}
