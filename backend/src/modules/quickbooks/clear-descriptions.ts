// ---------------------------------------------------------------------------
// One-time cleanup: blank the sales Description on every LEDGER-MAPPED
// QuickBooks item (the descriptions that were historically filled from the
// website description). This is the decision core — pure and unit-tested;
// the supervised production runner executes exactly these decisions.
//
// Hard rules:
// - ONLY mapped website items are touched. QuickBooks-only local items
//   (fees, services, water, frozen food, discounts…) are never inspected
//   for writing, let alone modified.
// - The update payload carries ONLY {Id, SyncToken, sparse, Description:""} —
//   by construction it cannot change the name, SKU, price, cost, quantity,
//   tax status, category, accounts, active status, or the permanent mapping.
// - PurchaseDesc is untouched (this codebase has never written it).
// - Idempotent: an already-blank description is a no-op, so reruns change
//   nothing.
// ---------------------------------------------------------------------------

export type ClearDecision =
  | { action: "skip_unmapped" } // QuickBooks-only local item — never touched
  | { action: "skip_missing" } // mapped id no longer resolves to an item
  | { action: "skip_inactive" } // mapped but inactive — leave alone
  | { action: "already_blank" } // nothing to do (what reruns hit)
  | { action: "clear" }

export function decideClearAction(input: {
  isMapped: boolean
  itemFound: boolean
  active?: boolean
  description?: string | null
}): ClearDecision {
  if (!input.isMapped) return { action: "skip_unmapped" }
  if (!input.itemFound) return { action: "skip_missing" }
  if (input.active === false) return { action: "skip_inactive" }
  if (!String(input.description ?? "").trim()) return { action: "already_blank" }
  return { action: "clear" }
}

// The ONLY payload the cleanup may send. Exactly four keys.
export function buildClearDescriptionPayload(item: {
  Id: string
  SyncToken: string
}): { Id: string; SyncToken: string; sparse: true; Description: "" } {
  return {
    Id: String(item.Id),
    SyncToken: String(item.SyncToken),
    sparse: true,
    Description: "",
  }
}

// Post-write verification against the update response: the description must
// actually be gone, or the item counts as a FAILURE (never silently assumed).
export function isDescriptionCleared(updated: {
  Description?: string | null
}): boolean {
  return !String(updated?.Description ?? "").trim()
}

// ---------------------------------------------------------------------------
// EXECUTION-TIME WRITE ASSERTIONS — the hard guarantee.
//
// Every write the cleanup performs must pass these gates immediately before
// it is sent. Any deviation throws, which aborts the run before the write.
// ---------------------------------------------------------------------------

// The ONLY QuickBooks payload shape the cleanup may send: exactly these four
// keys, Description exactly the empty string. Anything else (Name, Sku,
// UnitPrice, QtyOnHand, Taxable, accounts, ParentRef, Active, …) is rejected.
export function assertQboClearPayload(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload).sort()
  if (keys.join(",") !== "Description,Id,SyncToken,sparse") {
    throw new Error(
      `WRITE ASSERTION FAILED: QuickBooks payload keys must be exactly ` +
        `[Description, Id, SyncToken, sparse], got [${keys.join(", ")}]`
    )
  }
  if (payload.Description !== "") {
    throw new Error(
      `WRITE ASSERTION FAILED: Description must be the empty string`
    )
  }
  if (payload.sparse !== true) {
    throw new Error(`WRITE ASSERTION FAILED: sparse must be true`)
  }
  if (typeof payload.Id !== "string" || !payload.Id) {
    throw new Error(`WRITE ASSERTION FAILED: Id must be a non-empty string`)
  }
  if (typeof payload.SyncToken !== "string") {
    throw new Error(`WRITE ASSERTION FAILED: SyncToken must be a string`)
  }
}

// The ONLY Medusa write the cleanup may perform: setting the single metadata
// key quickbooks_description to "" on the product row. The SQL is a frozen
// constant — the assertion requires byte-for-byte equality AND independently
// scans the statement for forbidden fields, so no variant of this statement
// can touch the website description (or anything else).
export const APPROVED_MEDUSA_CLEAR_SQL =
  "update product set metadata = coalesce(metadata, '{}'::jsonb) || " +
  "jsonb_build_object('quickbooks_description', ''::text) " +
  "where id = $1 and deleted_at is null"

const MEDUSA_FORBIDDEN_TOKENS = [
  "description", // the website description column (standalone)
  "subtitle",
  "title",
  "handle",
  "variant",
  "image",
  "tag",
  "categor",
  "price",
  "inventory",
  "map",
]

export function assertMedusaClearWrite(sql: string, params: unknown[]): void {
  if (sql !== APPROVED_MEDUSA_CLEAR_SQL) {
    throw new Error(
      `WRITE ASSERTION FAILED: Medusa SQL differs from the approved statement`
    )
  }
  // Belt and braces: even the approved constant is re-scanned. Strip the one
  // permitted metadata key, then no forbidden field name may remain.
  const residual = sql.replace(/quickbooks_description/g, "")
  for (const tok of MEDUSA_FORBIDDEN_TOKENS) {
    if (residual.toLowerCase().includes(tok)) {
      throw new Error(
        `WRITE ASSERTION FAILED: Medusa SQL references forbidden field "${tok}"`
      )
    }
  }
  if (params.length !== 1 || typeof params[0] !== "string" || !params[0]) {
    throw new Error(
      `WRITE ASSERTION FAILED: Medusa write takes exactly one product id parameter`
    )
  }
}

// Medusa-side decision: only non-blank quickbooks_description values are
// written (blank/absent = no-op, which is what reruns hit).
export function decideMedusaClear(
  currentQbDescription: string | null | undefined
): "clear" | "already_blank" {
  return String(currentQbDescription ?? "").trim() ? "clear" : "already_blank"
}
