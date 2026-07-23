import { ExecArgs } from "@medusajs/types"
import { seedInventoryItems } from "../modules/quickbooks/seed-core"

// Manual one-shot / resync: pushes the store catalog to QuickBooks
// (overwrites matches, creates missing). Items that exist only in QuickBooks
// are never touched. Idempotent — same logic as the admin "Resync all" button.
export default async function seedQuickbooksItems({ container }: ExecArgs) {
  console.log("Pushing store catalog to QuickBooks…")
  const r = await seedInventoryItems(container)
  console.log("")
  console.log("Resync complete:")
  console.log(`  Created in QBO:        ${r.created}`)
  console.log(`  Overwritten:           ${r.updated}`)
  console.log(`  Converted to Inventory: ${r.converted}`)
  console.log(`  Already in sync:       ${r.unchanged}`)
  console.log(`  Skipped (no key):      ${r.skipped}`)
  console.log(`  Failed:                ${r.failed}`)
}
