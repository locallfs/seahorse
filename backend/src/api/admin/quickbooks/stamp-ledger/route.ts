/* eslint-disable @typescript-eslint/no-explicit-any */
import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../modules/quickbooks/service"
import { stampLedger } from "../../../../modules/quickbooks/ledger-stamp"

// MANUAL trigger for ledger stamping — admin-authenticated, user-invoked
// only. Read-only towards QuickBooks; aborts (writing nothing) on any guard.
export async function POST(req: any, res: any) {
  console.log("[admin/quickbooks/stamp-ledger] start")
  const qb = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  try {
    // First-ever run must be declared explicitly: {"allow_initial": true}.
    // Without it, a missing baseline aborts (G-NOBASELINE) — never silent.
    const result = await stampLedger(req.scope, qb, {
      allowInitial: req.body?.allow_initial === true,
    })
    await qb
      .logSync({
        direction: "medusa_to_qbo",
        entityType: "ledger",
        sku: result.aborted
          ? `ledger stamp ABORTED: ${result.aborted}`
          : `ledger stamped: ${result.paired} paired, ${result.unmatched} unmatched`,
        status: result.aborted ? "needs_manual_review" : "success",
      })
      .catch(() => {})
    console.log("[admin/quickbooks/stamp-ledger] end", result)
    res.json({ ok: !result.aborted, result })
  } catch (err: any) {
    await qb
      .logSync({
        direction: "medusa_to_qbo",
        entityType: "ledger",
        status: "failed",
        errorMessage: `Ledger stamping failed: ${err?.message || err}`,
      })
      .catch(() => {})
    console.error("[admin/quickbooks/stamp-ledger] error", err?.message || err)
    res.status(500).json({ error: err?.message || "Ledger stamping failed" })
  }
}
