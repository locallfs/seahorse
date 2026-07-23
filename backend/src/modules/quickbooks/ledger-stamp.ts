/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContainerRegistrationKeys } from "@medusajs/utils"
import type QuickbooksModuleService from "./service"
import { listAllActiveItems } from "./items"
import { readCatalogVariants } from "./db-reads"
import { reconcile, type ReconcileResult } from "./reconcile"

export type StampResult = {
  paired: number
  unmatched: number
  aborted: string | null
  stats: ReconcileResult["stats"] | null
}

// READ-ONLY (towards QuickBooks) ledger stamping: pairs store variants with
// QBO items via the shared reconcile() engine and records pairings in
// quickbooks_item_map. Writes nothing to QuickBooks. Runs ONLY when invoked
// explicitly (admin route) — no boot-time or scheduled execution.
// On ANY reconcile abort (blank reads, empty QBO list, duplicate/ambiguous
// codes, SKU/UPC conflicts, <85% pairing rate, >5% drop vs the last
// successful run) it writes NOTHING.
export async function stampLedger(
  container: { resolve: (k: string) => any },
  qb: QuickbooksModuleService,
  opts?: { allowInitial?: boolean }
): Promise<StampResult> {
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rows = await readCatalogVariants(pg)
  const items = await listAllActiveItems(qb)

  // Structured baseline (typed table) — never parsed from log text. A missing
  // baseline ABORTS unless the operator explicitly declares an initial run.
  const baselinePaired = await qb.getLedgerBaseline()

  const result = reconcile(
    rows.map((r) => ({
      variant_id: r.variant_id,
      title: r.product_title,
      sku: r.sku,
      upc: r.upc,
      barcode: r.barcode,
    })),
    items.map((it) => ({
      id: String(it.Id),
      sku: it.Sku ?? null,
      name: it.Name,
    })),
    { baselinePaired, requireBaseline: !opts?.allowInitial }
  )

  if (result.abort) {
    return {
      paired: 0,
      unmatched: result.stats.variants,
      aborted: result.abort,
      stats: result.stats,
    }
  }

  for (const p of result.pairs) {
    await qb.mapVariantToQboItem(p.variantId, p.qboItemId).catch(() => {})
  }
  await qb
    .saveLedgerBaseline({
      paired: result.pairs.length,
      codeBearing: result.stats.codeBearing,
      variants: result.stats.variants,
      qboItems: result.stats.qboItems,
    })
    .catch(() => {})
  return {
    paired: result.pairs.length,
    unmatched:
      result.stats.unmatchedCodeBearingVariants + result.stats.noCode,
    aborted: null,
    stats: result.stats,
  }
}
