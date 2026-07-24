/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../modules/quickbooks/service"
import {
  QB_DESCRIPTION_METADATA_KEY,
  sanitizeQbDescription,
} from "../../../../modules/quickbooks/qb-description"
import {
  getItemById,
  updateItemSparse,
} from "../../../../modules/quickbooks/items"

// Saves the SEPARATE QuickBooks Description for one product and pushes it to
// the product's mapped QuickBooks item(s). This field is the ONLY thing that
// ever reaches a QuickBooks item Description — the website description
// (product.description) is never sent, and blank stays blank on both sides.
export async function POST(req: any, res: any) {
  console.log("[qb-description] POST start")
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const qb = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService

  const productId = String(req.body?.product_id ?? "").trim()
  if (!productId) {
    res.status(400).json({ error: "product_id is required" })
    return
  }
  // Plain text, single line, ~120 chars — enforced server-side regardless of
  // what the client sends.
  const value = sanitizeQbDescription(req.body?.value)

  // 1) Save on the product (metadata only — the website description column is
  //    untouched by design).
  const upd = await pg.raw(
    `update product
        set metadata = coalesce(metadata, '{}'::jsonb)
                       || jsonb_build_object('${QB_DESCRIPTION_METADATA_KEY}', ?::text)
      where id = ? and deleted_at is null
      returning id`,
    [value, productId]
  )
  if (!upd?.rows?.length) {
    res.status(404).json({ error: "product not found" })
    return
  }

  // 2) Push to the mapped QuickBooks item(s). Blank clears the QuickBooks
  //    description (blank is the normal default — no fallback to anything).
  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") {
    console.log("[qb-description] POST end (sync disabled)")
    res.json({ saved: true, value, pushed: 0, note: "QuickBooks sync is disabled — saved locally only" })
    return
  }
  const mapRes = await pg.raw(
    `select m.qbo_item_id
       from quickbooks_item_map m
       join product_variant pv on pv.id = m.variant_id and pv.deleted_at is null
      where pv.product_id = ? and m.deleted_at is null`,
    [productId]
  )
  const itemIds: string[] = (mapRes?.rows || []).map((r: any) => String(r.qbo_item_id))
  let pushed = 0
  for (const id of itemIds) {
    try {
      const item = await getItemById(qb, id)
      if (!item) throw new Error("item not found in QuickBooks")
      if (sanitizeQbDescription(item.Description) === value) {
        pushed++ // already identical — idempotent no-op
        continue
      }
      await updateItemSparse(qb, {
        itemId: String(item.Id),
        syncToken: item.SyncToken,
        fields: { Description: value }, // "" clears it
      })
      pushed++
      await qb
        .logSync({
          direction: "medusa_to_qbo",
          entityType: "description",
          qboItemId: id,
          status: "success",
          errorMessage: value ? undefined : "cleared",
        })
        .catch(() => {})
    } catch (e: any) {
      // Visible failure: red row in the activity log + error to the editor.
      await qb
        .logSync({
          direction: "medusa_to_qbo",
          entityType: "description",
          qboItemId: id,
          status: "failed",
          errorMessage: `QuickBooks Description push failed: ${String(e?.message || e).slice(0, 200)}`,
        })
        .catch(() => {})
      console.log("[qb-description] POST end (push failed)")
      res.status(502).json({
        saved: true,
        value,
        pushed,
        error: `Saved on the website, but pushing to QuickBooks item ${id} failed: ${String(e?.message || e).slice(0, 200)}`,
      })
      return
    }
  }
  console.log("[qb-description] POST end")
  res.json({ saved: true, value, pushed })
}
