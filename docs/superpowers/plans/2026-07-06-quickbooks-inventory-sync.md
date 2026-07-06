# QuickBooks Two-Way Inventory Sync — Implementation Plan

> **For agentic workers:** Execute task-by-task; each ends with a verifiable deliverable. Steps use checkbox (`- [ ]`) syntax. Spec: `project_specs.md` → "QuickBooks Online — Inventory Sync (Phase 3)". Current-state assessment done 2026-07-06 (see conversation).

**Goal:** Keep item stock counts identical between the website (Medusa) and QuickBooks Online (QBO), both directions, within ~30 seconds, keyed by SKU — then flip from sandbox to production for go-live.

**Architecture:** QBO items are rebuilt as **Inventory** type (only type that carries `QtyOnHand`). Medusa→QBO: a subscriber on stock-changing events sparse-updates the QBO item's `QtyOnHand` (with retry + a sync-log). QBO→Medusa: an Intuit webhook (signature-verified) fetches changed items and updates Medusa `stocked_quantity`. A scheduled job keeps the OAuth token alive; the admin page shows health + a sync log + a resync button.

**Tech Stack:** Medusa v2, TypeScript, the existing `quickbooks` module (OAuth + AES-256-GCM token store + `qboRequest`/`qboQuery`), Railway (Dockerfile deploy), Intuit QBO Accounting API v3 + Intuit webhooks.

## Global Constraints

- Deploys to Railway via **Dockerfile only** (never nixpacks). Announce any Railway env-var change to the user BEFORE pushing code that needs it.
- No test framework in the backend. Verify each task with `npx medusa build` (compiles) + **manual verification against the QBO sandbox on the deployed backend**. Functional QBO/webhook behavior is verified on Railway (sandbox mode), reported by the user.
- Build and prove everything in **SANDBOX** (`QUICKBOOKS_ENVIRONMENT=sandbox`). Production is Task 8 (go-live), user-coordinated.
- QBO items MUST be **Inventory** type with `TrackQtyOnHand: true`. **Join key = the variant's `upc` when set (real registered UPC for dry goods/supplies) → else `barcode` → else the generated `sku` (livestock have no UPC).** Everywhere a task below says "SKU" as the match key, resolve it through this UPC-first key and store that resolved value in the QBO item's `Sku` field. Conflict resolution: **last-write-wins**.
- The supplies must have their real UPCs populated in the Medusa variant `upc` field before go-live (entry method chosen with the user: barcode scan in ReefNerds / manual / CSV import).
- All QBO config stays in env vars; tokens stay encrypted via existing `crypto.ts`.
- Verify exact QBO request bodies (Inventory item fields, sparse update + `SyncToken`) and Intuit webhook signature scheme against Intuit's docs via Context7 at implementation time — do not hand-write from memory.

---

### Task 1: QBO Inventory item operations

**Files:** Modify `backend/src/modules/quickbooks/items.ts`.

- [ ] Add `findInventoryAccounts(service)`: query QBO for the **Inventory Asset** account (`AccountType='Other Current Asset'` / `AccountSubType='Inventory'` or the default "Inventory Asset") and the **COGS** account (`AccountType='Cost of Goods Sold'`); reuse `findDefaultIncomeAccount`. Returns `{ incomeAccountId, assetAccountId, cogsAccountId }`. Throw a clear error if any is missing (tells the owner to enable inventory tracking in QBO).
- [ ] Add `createInventoryItem(service, { name, sku, qtyOnHand, unitPrice?, description?, accounts, invStartDate })`: POST `/item` with `Type:'Inventory'`, `TrackQtyOnHand:true`, `QtyOnHand`, `InvStartDate`, `IncomeAccountRef`, `AssetAccountRef` (inventory), `ExpenseAccountRef` (COGS). (Verify exact field names via Intuit docs.)
- [ ] Add `getItemBySku(service, sku)` returning `{ id, syncToken, qtyOnHand } | null` (extends existing `findItemBySku` to include `SyncToken` + `QtyOnHand`).
- [ ] Add `setItemQuantity(service, { itemId, syncToken, qtyOnHand })`: sparse update (`sparse:true`, `Id`, `SyncToken`, `QtyOnHand`) via POST `/item`. Returns the new `SyncToken`.
- [ ] Keep `createNonInventoryItem` for reference but stop using it in the seed.
- **Verify:** `npx medusa build` compiles.

### Task 2: Sync-log model + service methods

**Files:** Create `backend/src/modules/quickbooks/models/sync-log.ts`; create a migration; modify `backend/src/modules/quickbooks/service.ts`.

- [ ] Model `quickbooks_sync_log`: `id`, `direction` ('medusa_to_qbo' | 'qbo_to_medusa'), `sku` (nullable), `entity_type` (default 'item'), `qbo_item_id` (nullable), `status` ('success' | 'failed' | 'needs_manual_review'), `error_message` (nullable, ≤2000), `created_at`.
- [ ] Generate migration (`npx medusa db:generate quickbooks`), commit it.
- [ ] Service methods: `logSync({...})`, `listSyncLogs(limit=50)`, `lastSuccessfulSyncAt()`.
- **Verify:** build compiles; migration file created.

### Task 3: Seed real stock as Inventory items (idempotent)

**Files:** Modify `backend/src/scripts/seed-quickbooks-items.ts` (or add `seed-quickbooks-inventory.ts`).

- [ ] For each variant with a SKU: read the variant's current Medusa on-hand quantity; if no QBO item for that SKU, `createInventoryItem` with that initial `QtyOnHand`; if it exists as **NonInventory**, log it for manual attention (QBO can't convert type in place). Skip empty SKUs. Idempotent; counts created/existed/skipped/failed.
- **Verify:** build compiles; run against **sandbox** on the deployed backend and confirm Inventory items appear in the QBO sandbox with quantities.

### Task 4: Medusa → QBO live sync (Phase D)

**Files:** Create `backend/src/subscribers/quickbooks-inventory-sync.ts`; add a retry helper in the module.

- [ ] Subscribe to the Medusa v2 event(s) that fire when stock changes (order placement decrement + admin inventory edits). **Verify the exact event name(s) via Medusa docs (Context7)** — candidates: `inventory-item.updated`, reservation/`order.placed`. Resolve the affected variant → SKU → new on-hand.
- [ ] For that SKU: `getItemBySku` → `setItemQuantity` with retry/backoff (1s→5s→30s); on final failure `logSync(status:'needs_manual_review')`, else `logSync(status:'success')`. Guard with an env flag (e.g. `QUICKBOOKS_SYNC_ENABLED`) so it can be turned off instantly.
- **Verify:** build; on sandbox, change a product's stock in Medusa admin → QBO sandbox item quantity updates within ~30s; a row appears in the sync log.

### Task 5: QBO → Medusa webhook (Phase E)

**Files:** Create `backend/src/api/webhooks/quickbooks/route.ts`; register it as a public route in `backend/src/api/middlewares.ts` (no customer/admin auth — it's Intuit-called and signature-verified).

- [ ] POST handler: read the **raw** body, verify the Intuit signature (HMAC-SHA256 with `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN`, compare to the `intuit-signature` header — **confirm scheme via Intuit docs**). Reject on mismatch.
- [ ] Parse `eventNotifications` → for `Item` entity `Update` events: fetch the item from QBO (`getItemBySku`/by id) → map by SKU → update Medusa `stocked_quantity` for that variant → `logSync(direction:'qbo_to_medusa')`.
- [ ] New QBO item (`Create`) → create a **draft/unpublished** Medusa product (staff add photos/description before it shows on site), per spec. (Can be a follow-up if it risks scope.)
- **Verify:** build; the middleware guard added for auctions does NOT block this route; on sandbox, change an item quantity in QBO → Medusa stock updates; sync log row appears.

### Task 6: Scheduled token-refresh job

**Files:** Create `backend/src/jobs/quickbooks-refresh.ts`.

- [ ] Daily schedule: call `getValidAccessToken` (refreshes if near expiry) so the refresh token never lapses; on failure write `last_error` on the connection. Gate on connection existing.
- **Verify:** build; job registered (appears in medusa build job list).

### Task 7: Admin visibility (Phase F)

**Files:** Modify `backend/src/api/admin/quickbooks/route.ts` (status) + add `backend/src/api/admin/quickbooks/resync/route.ts`; modify `backend/src/admin/routes/integrations/quickbooks/page.tsx`.

- [ ] Status API: add `last_sync_at`, recent `sync_log` (last 50), and a computed `health` ('connected' | 'token_expired' | 'disconnected').
- [ ] Resync route (POST): re-run the Inventory seed/resync safely (idempotent).
- [ ] Admin page: show health, last-sync timestamp, a scrollable recent-log table (green/red), and a "Resync all" button.
- **Verify:** build; admin page renders the new sections.

### Task 8: ReefNerds UPC barcode scanner (parallel; populates real UPCs on supplies)

**Files:** Add `expo-camera` to `mobile/package.json`; modify the ReefNerds product form (`ProductFormFields` used by `mobile/app/(app)/product/[id].tsx` and `new.tsx`).

- [ ] Add `expo-camera`. Add a "Scan barcode" button that opens a camera scanner (`CameraView`, `barcodeScannerSettings` for `upc_a`/`upc_e`/`ean13`/`ean8`) and writes the scanned value into the variant `upc` field; ensure the form save persists `upc` to the Medusa variant.
- [ ] Camera permission already declared in `mobile/app.json` (photos). Build via EAS **iOS first, then Android**, preview profile (`npm run build:ios` then `build:android` from `mobile/`).
- **Verify:** `mobile` typechecks (`npx tsc --noEmit`); EAS preview build succeeds; scanning a product barcode fills the UPC and saves.

### Task 9: Go-live (Phase G) — user-coordinated

- [ ] User: create/confirm **production** Intuit app keys; set Railway env (`QUICKBOOKS_ENVIRONMENT=production`, production `QUICKBOOKS_CLIENT_ID/SECRET`, `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN`, `QUICKBOOKS_REDIRECT_URI` matching the Intuit app) — **announced before code push**.
- [ ] User: in the admin page, **Disconnect** (clears sandbox realm tokens), then **Connect** to the **real** QuickBooks company.
- [ ] Run resync to create Inventory items (with current stock) in the real company (or match existing SKUs).
- [ ] User: register the Intuit **webhook** URL (`/webhooks/quickbooks`) + Item entity + verifier token in the Intuit app.
- [ ] Monitor the admin sync log for 48h.

---

## Out of scope (v1)
Price sync, customer sync, invoice/sales-receipt creation, multi-location inventory (all per spec `project_specs.md:340-343`).

## Verification approach (per CLAUDE.md — no unit tests)
Every task: `npx medusa build` must compile. Functional QBO behavior is verified on the deployed Railway backend in **sandbox** mode by the user (change stock on one side, confirm the other updates within ~30s and a sync-log row appears). Only after sandbox is proven do we run Task 8.
