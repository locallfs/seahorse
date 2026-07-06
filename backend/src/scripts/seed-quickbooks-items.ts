import { ExecArgs } from "@medusajs/types"
import { seedInventoryItems } from "../modules/quickbooks/seed-core"

// Manual one-shot / resync: creates QBO Inventory items for every variant that
// doesn't have one yet, using its current Medusa on-hand as the starting count.
// Idempotent — safe to re-run. Same logic the admin "Resync all" button uses.
export default async function seedQuickbooksItems({ container }: ExecArgs) {
  console.log("Seeding QuickBooks Inventory items…")
  const r = await seedInventoryItems(container)
  console.log("")
  console.log("Seed complete:")
  console.log(`  Created in QBO:   ${r.created}`)
  console.log(`  Already existed:  ${r.existed}`)
  console.log(`  Skipped (no key): ${r.skipped}`)
  console.log(`  Failed:           ${r.failed}`)
}
