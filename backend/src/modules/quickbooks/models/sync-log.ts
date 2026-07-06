import { model } from "@medusajs/utils"

// One row per sync attempt (either direction). created_at/updated_at are added
// automatically by Medusa models.
export const QuickbooksSyncLog = model.define("quickbooks_sync_log", {
  id: model.id().primaryKey(),
  direction: model.text(), // "medusa_to_qbo" | "qbo_to_medusa"
  entity_type: model.text().default("item"),
  sku: model.text().nullable(),
  qbo_item_id: model.text().nullable(),
  status: model.text(), // "success" | "failed" | "needs_manual_review"
  error_message: model.text().nullable(),
})
