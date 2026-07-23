import { model } from "@medusajs/utils"

// Structured record of each successful reconciliation — the G-BASELINE guard
// reads the latest row's paired_count (never parsed from free-form log text).
export const QuickbooksLedgerBaseline = model.define(
  "quickbooks_ledger_baseline",
  {
    id: model.id().primaryKey(),
    paired_count: model.number(),
    code_bearing_count: model.number(),
    variant_count: model.number(),
    qbo_item_count: model.number(),
  }
)
