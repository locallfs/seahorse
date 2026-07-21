/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../modules/quickbooks/service"
import { applyQboItemToStore } from "../../../modules/quickbooks/apply-item"

// HMAC-SHA256 of the raw body with the verifier token, base64, constant-time
// compared to the intuit-signature header (Intuit's documented scheme).
function verifySignature(
  raw: string,
  sig: string | undefined,
  verifier: string
): boolean {
  if (!sig) return false
  const hash = crypto
    .createHmac("sha256", verifier)
    .update(raw, "utf8")
    .digest("base64")
  const a = Buffer.from(hash)
  const b = Buffer.from(sig)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Collects QBO Item ids from either webhook payload shape:
// - Legacy: {eventNotifications:[{realmId, dataChangeEvent:{entities:[{name,id,operation}]}}]}
// - CloudEvents (mandatory after 2026-07-31): [{type:"qbo.item.updated.v1",
//   intuitentityid, intuitaccountid, ...}]
// Skips deletes and events for other QBO companies.
function collectItemIds(payload: any, realmId: string | null): string[] {
  const ids: string[] = []
  if (Array.isArray(payload)) {
    for (const ev of payload) {
      const [ns, entity, op] = String(ev?.type || "")
        .toLowerCase()
        .split(".")
      if (ns !== "qbo" || entity !== "item") continue
      if (op === "deleted") continue
      if (realmId && ev?.intuitaccountid && String(ev.intuitaccountid) !== realmId)
        continue
      if (ev?.intuitentityid) ids.push(String(ev.intuitentityid))
    }
  } else {
    for (const note of payload?.eventNotifications || []) {
      if (realmId && note?.realmId && String(note.realmId) !== realmId) continue
      for (const ent of note?.dataChangeEvent?.entities || []) {
        if (ent?.name !== "Item") continue
        if (ent?.operation === "Delete") continue
        if (ent?.id) ids.push(String(ent.id))
      }
    }
  }
  return Array.from(new Set(ids))
}

export async function POST(req: any, res: any) {
  console.log("[qb-webhook] start")
  const verifier = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
  const hasRawBody = req.rawBody != null
  const raw =
    typeof req.rawBody === "string"
      ? req.rawBody
      : req.rawBody
        ? Buffer.from(req.rawBody).toString("utf8")
        : JSON.stringify(req.body || {})
  const signature = req.headers["intuit-signature"]

  // Visibility: record every knock — accepted or rejected — in the sync log
  // so webhook delivery problems are diagnosable from the admin page/DB.
  const qbLog = (() => {
    try {
      return req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
    } catch {
      return null
    }
  })()
  const logKnock = async (status: "success" | "failed", msg: string) => {
    await qbLog
      ?.logSync({
        direction: "qbo_to_medusa",
        entityType: "webhook",
        sku: msg.slice(0, 60),
        status,
        errorMessage: `rawBody=${hasRawBody} sig=${signature ? "present" : "MISSING"} bytes=${raw.length}`,
      })
      .catch(() => {})
  }

  // Fail closed: without a verifier or a valid signature we do not process.
  if (!verifier) {
    console.warn("[qb-webhook] no verifier token configured")
    await logKnock("failed", "rejected: no verifier configured")
    return res.sendStatus(200)
  }
  if (!verifySignature(raw, signature, verifier)) {
    console.warn("[qb-webhook] invalid signature")
    await logKnock("failed", "rejected: invalid signature")
    return res.status(401).send("invalid signature")
  }
  await logKnock("success", "webhook accepted")

  if (process.env.QUICKBOOKS_SYNC_ENABLED !== "true") {
    return res.sendStatus(200)
  }

  const qb = req.scope.resolve(QUICKBOOKS_MODULE) as QuickbooksModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventory = req.scope.resolve(Modules.INVENTORY)

  try {
    const conn = await qb.getConnection()
    if (!conn) return res.sendStatus(200)

    let payload: any
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = req.body || {}
    }

    const itemIds = collectItemIds(
      payload,
      conn.realm_id ? String(conn.realm_id) : null
    )
    for (const id of itemIds) {
      await applyQboItemToStore(qb, query, inventory, id)
    }
    console.log("[qb-webhook] end")
    return res.sendStatus(200)
  } catch (err: any) {
    console.error("[qb-webhook] error", err?.message || err)
    await qb
      .logSync({
        direction: "qbo_to_medusa",
        status: "failed",
        errorMessage: err?.message || String(err),
      })
      .catch(() => {})
    // Ack anyway so Intuit doesn't disable the webhook on repeated 500s.
    return res.sendStatus(200)
  }
}
