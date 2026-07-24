/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import {
  defaultEnsureDeps,
  ensureQboItemForVariant,
} from "../modules/quickbooks/auto-create"

type SubscriberArgs = {
  event: { data: any }
  container: { resolve: (k: string) => any }
}

// Medusa → QuickBooks on PRODUCT CREATION (admin, mobile app, API, import,
// backend — every surface emits this module event). No stock edit and no
// manual resync required: the exactly-once ensure workflow creates or links
// the QuickBooks item the moment the variant exists. Duplicate events land on
// the ledger/adopt paths and can never create twice.
export default async function quickbooksProductCreated({
  event,
  container,
}: SubscriberArgs) {
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") return

  const qb = container.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    const conn = await qb.getConnection()
    if (!conn) return

    const raw: any = event?.data || {}
    const entries: any[] = Array.isArray(raw) ? raw : [raw]
    const variantIds = entries
      .map((e) => e?.id)
      .filter(Boolean)
      .map(String)
    if (!variantIds.length) return

    for (const variantId of variantIds) {
      const vres = await pg.raw(
        `select pv.id, pv.title as variant_title, p.title as product_title,
                nullif(trim(coalesce(pv.sku,'')),'') as sku,
                nullif(trim(coalesce(pv.upc,'')),'') as upc,
                nullif(trim(coalesce(pv.barcode,'')),'') as barcode
           from product_variant pv
           join product p on p.id = pv.product_id and p.deleted_at is null
          where pv.id = ? and pv.deleted_at is null`,
        [variantId]
      )
      const v = vres?.rows?.[0]
      if (!v) continue
      const key = v.upc || v.barcode || v.sku
      if (!key) continue // no identifying code yet — the 30-min monitor tracks it

      const ensured = await ensureQboItemForVariant(
        {
          variant_id: v.id,
          product_title: v.product_title,
          variant_title: v.variant_title,
          sku: v.sku,
          upc: v.upc,
          barcode: v.barcode,
        },
        defaultEnsureDeps(qb, pg)
      )
      if (ensured.outcome === "created" || ensured.outcome === "adopted") {
        await qb.logSync({
          direction: "medusa_to_qbo",
          entityType: "auto-create",
          sku: String(key),
          qboItemId: ensured.qboItemId,
          status: "success",
          errorMessage: JSON.stringify({
            trigger: "product-variant.created",
            outcome: ensured.outcome,
            initial_qty:
              ensured.outcome === "created" ? ensured.initialQty : undefined,
          }),
        })
      }
      // review / config_error / created_unmapped raise their own visible
      // alerts inside the ensure workflow.
    }
  } catch (err: any) {
    await qb
      .logSync({
        direction: "medusa_to_qbo",
        entityType: "auto-create",
        status: "failed",
        errorMessage: `product-created handler: ${err?.message || err}`,
      })
      .catch(() => {})
  }
}

export const config = {
  event: ["product.product-variant.created"],
}
