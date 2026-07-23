import { model } from "@medusajs/utils"

// Permanent variant ↔ QBO item pairing. IDs never change on either side, so
// the sync survives SKU→UPC replacement (identifiers are only needed for a
// pair's first introduction; after that this ledger is the join).
export const QuickbooksItemMap = model.define("quickbooks_item_map", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  qbo_item_id: model.text(),
})
