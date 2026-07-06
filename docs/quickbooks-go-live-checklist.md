# QuickBooks Inventory Sync — Go-Live Checklist

**Read this first (plain English):** Every piece of the two-way stock sync is
already written, deployed, and sitting on Railway **turned off**. Nothing syncs
to or from QuickBooks yet. This checklist is the *only* work left, and every
step here needs you to be at the QuickBooks computer. Do the parts in order.

When you finish, changing a stock number in the store updates QuickBooks, and
changing it in QuickBooks updates the store — automatically.

Your backend address (you'll paste it in a couple of places):
`https://seahorse-production.up.railway.app`

---

## Part A — Turn on inventory in QuickBooks (5 min)

QuickBooks can only hold a stock count if inventory tracking is switched on, and
that feature only exists on the **Plus** or **Advanced** plan.

1. Sign in to QuickBooks Online with the **real company** (not the sandbox/test one).
2. Make sure the plan is **Plus** or **Advanced**. (Gear icon → *Account and Settings* → *Billing & Subscription*. Upgrade if it says Simple Start or Essentials.)
3. Gear icon → **Account and Settings** → **Sales** tab → **Products and services**.
4. Turn **ON** these two switches, then **Save**:
   - *Track quantity and price/rate*
   - *Track inventory quantity on hand*

**Why:** flipping these on is what makes QuickBooks create the two behind-the-scenes
accounts the sync needs (*Inventory Asset* and *Cost of Goods Sold*). Without them,
QuickBooks refuses to store a stock number.

---

## Part B — Get production keys + set up the webhook in Intuit (10 min)

Do this at the Intuit Developer site: https://developer.intuit.com → **My Apps**.

1. Open your app (or the production version of it).
2. Go to **Keys & credentials → Production** and copy the **Client ID** and **Client Secret**. Keep them handy for Part C.
3. Under **Redirect URIs (Production)**, make sure it lists the **exact same** redirect URI you already use for the sandbox (whatever is currently in the `QUICKBOOKS_REDIRECT_URI` Railway variable). If it's missing, add it and save.
4. Go to the **Webhooks** section. Set the endpoint URL to:
   ```
   https://seahorse-production.up.railway.app/webhooks/quickbooks
   ```
5. Subscribe it to the **Item** entity (Create + Update events). Save.
6. Copy the **Verifier Token** it shows you — you'll need it in Part C.

**Why:** the webhook is how QuickBooks tells the store "someone changed a stock
number over here." The verifier token is a shared password that proves the
message really came from Intuit and not a stranger.

---

## Part C — Set the Railway variables (5 min) — this is the ON switch

Railway → your backend service → **Variables**. Add/confirm these, then let it redeploy.

| Variable | Value |
|---|---|
| `QUICKBOOKS_ENVIRONMENT` | `production` |
| `QUICKBOOKS_CLIENT_ID` | *(production Client ID from Part B)* |
| `QUICKBOOKS_CLIENT_SECRET` | *(production Client Secret from Part B)* |
| `QUICKBOOKS_REDIRECT_URI` | *(same redirect URI, must match the Intuit app exactly)* |
| `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN` | *(verifier token from Part B, step 6)* |
| `QUICKBOOKS_ENCRYPTION_KEY` | *(already set — leave it alone)* |
| `QUICKBOOKS_SYNC_ENABLED` | `true` |

`QUICKBOOKS_SYNC_ENABLED=true` is the master switch. Until it's `true`, the whole
engine stays asleep — so it's fine to set the other variables first and flip this
one last once you're ready.

**Why:** these tell the backend to talk to the *real* QuickBooks company with the
*real* keys, and `=true` wakes the sync up.

---

## Part D — Connect and do the first push (5 min)

1. Open **Medusa admin** → **QuickBooks** (left menu).
2. The badge at the top should say **Not connected**. Click **Connect to QuickBooks** and authorize the **real company**.
3. After it returns, the page shows **Connected**, and **Live sync: ON**.
4. Click **Resync all to QuickBooks**. This creates a QuickBooks inventory item for every product, starting each one at its current store stock. Safe to run more than once.
5. Watch the **Recent sync activity** list fill in. Green = success.

---

## Part E — Scan UPCs onto supplies (do anytime, but before they'll sync)

Products match between the store and QuickBooks by **UPC** (falling back to
barcode, then SKU). Live animals don't have UPCs — that's fine, they match by SKU.
Dry goods and supplies should have their real UPC scanned in.

1. Open the **ReefNerds** app (the new build — v0.0.9+, iOS build 6 / Android 5).
2. Open a supply product (or create one), find the **Barcode** section, tap **Scan**, and point the camera at the box's barcode. The UPC fills in. Save.
3. Repeat for each supply. You can do this before or after go-live; items only sync once they have a UPC and you've run a resync (or edited their stock).

---

## Part F — Prove it works (2 min)

1. **Store → QuickBooks:** In ReefNerds or Medusa admin, change one product's stock by 1. Within a few seconds the same item's *Qty on Hand* in QuickBooks should change to match. (The activity log shows a green `→ QBO` row.)
2. **QuickBooks → Store:** In QuickBooks, adjust that same item's quantity. Within a few seconds the store's stock should follow. (Activity log shows a green `← QBO` row.)

If both directions move, you're live. If a row shows red, hover/read the error in
the activity log — it names the item and what went wrong.

---

## If something looks wrong

- **Badge says "Reconnect needed"** → the QuickBooks login expired; click **Reconnect**.
- **Live sync says OFF but you set the variable** → the redeploy may not have finished, or `QUICKBOOKS_SYNC_ENABLED` isn't exactly `true`. Re-check the Railway variable and redeploy.
- **An item won't sync** → it probably has no UPC/SKU, or its name/UPC doesn't exist yet in QuickBooks. Run **Resync all** once, then retry.
- Nothing here can double-count or loop: each side skips writing when the numbers already match.
