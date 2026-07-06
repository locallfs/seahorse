import { MedusaContainer } from "@medusajs/types"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"

// Keeps the QuickBooks connection alive: exercising getValidAccessToken forces
// a token refresh (which rotates the long-lived refresh token) so the
// connection never silently lapses when no sync traffic is flowing.
export default async function quickbooksRefresh(container: MedusaContainer) {
  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  const conn = await qb.getConnection()
  if (!conn) return
  try {
    await qb.getValidAccessToken()
  } catch (err: any) {
    await qb
      .recordError(`Scheduled token refresh failed: ${err?.message || err}`)
      .catch(() => {})
  }
}

export const config = {
  name: "quickbooks-refresh",
  schedule: "0 */12 * * *", // every 12 hours
}
