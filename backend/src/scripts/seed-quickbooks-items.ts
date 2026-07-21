import { ExecArgs } from "@medusajs/types"
import { seedInventoryItems } from "../modules/quickbooks/seed-core"

// Manual one-shot / resync: pushes the store catalog to QuickBooks as the
// MASTER list (overwrites matches, creates missing, retires extras).
// Idempotent — safe to re-run. Same logic the admin "Resync all" button uses.
export default async function seedQuickbooksItems({ container }: ExecArgs) {
  console.log("Pushing store catalog to QuickBooks (master-list resync)…")
  const r = await seedInventoryItems(container)
  console.log("")
  console.log("Resync complete:")
  console.log(`  Created in QBO:        ${r.created}`)
  console.log(`  Overwritten:           ${r.updated}`)
  console.log(`  Converted to Inventory: ${r.converted}`)
  console.log(`  Retired (not on site): ${r.retired}`)
  console.log(`  Already in sync:       ${r.unchanged}`)
  console.log(`  Skipped (no key):      ${r.skipped}`)
  console.log(`  Failed:                ${r.failed}`)
}
