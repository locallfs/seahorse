import { model } from "@medusajs/utils"

export const QuickbooksConnection = model.define("quickbooks_connection", {
  id: model.id().primaryKey(),
  realm_id: model.text(),
  access_token_encrypted: model.text(),
  refresh_token_encrypted: model.text(),
  access_token_expires_at: model.dateTime(),
  refresh_token_expires_at: model.dateTime().nullable(),
  environment: model.text().default("sandbox"),
  last_error: model.text().nullable(),
})
