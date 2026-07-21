/* eslint-disable @typescript-eslint/no-explicit-any */
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"

type SubscriberArgs = {
  event: { name?: string; data: any }
  container: { resolve: (k: string) => any }
}

// TEMPORARY diagnostic: hears every event on the bus. Logs every event name
// to the server console, and writes inventory-related ones to the QuickBooks
// sync log so they're visible on the admin page. Remove once the live
// store→QBO sync trigger is confirmed.
export default async function qbDiagAllEvents({
  event,
  container,
}: SubscriberArgs) {
  try {
    const name = event?.name || "(unnamed)"
    console.log(
      "[qb-diag] event:",
      name,
      JSON.stringify(event?.data ?? null)?.slice(0, 200)
    )
    if (!/inventor/i.test(name)) return
    const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
    await qb
      .logSync({
        direction: "medusa_to_qbo",
        entityType: "diag",
        sku: `diag heard: ${name}`,
        status: "success",
      })
      .catch(() => {})
  } catch {
    // diagnostics must never break anything
  }
}

export const config = { event: "*" }
