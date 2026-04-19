# Project Specs — Woody's Seahorse Aquarium


## What the app does and who uses it

A public-facing website for Woody's Seahorse Aquarium that lets customers browse and purchase live saltwater fish, corals, and aquarium equipment through an online store. Two staff members manage inventory, orders, and site content through an admin dashboard. A companion mobile app lets employees upload product photos and promo videos directly from their phones.


---


## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Fast, SEO-friendly storefront |
| Styling | Tailwind CSS | Consistent dark-themed design |
| E-commerce backend | Medusa.js v2 | Headless store engine (products, orders, cart, checkout) |
| Database | PostgreSQL | Managed by Railway, used by Medusa |
| Payments | Stripe + PayPal | Both supported natively via Medusa payment plugins |
| File storage | Bunny.net | Product images and promo videos (4K capable, cheap CDN) |
| Email marketing | Klaviyo | Order emails, abandoned cart, new arrival announcements |
| Frontend hosting | Vercel | Deploys the Next.js storefront |
| Backend hosting | Railway | Runs the Medusa.js server persistently |
| Auth (admin) | Medusa built-in admin | Two admin users, no public registration |
| Mobile app | React Native + Expo | iOS + Android employee upload app |


---


## Pages and User Flows

### Public (no login required)
- `/` — Homepage with hero video/banner, featured fish, featured coral, about section
- `/shop` — Full product catalog with filters (fish, coral, equipment)
- `/shop/[category]` — Category page (e.g. /shop/fish, /shop/coral, /shop/equipment)
- `/products/[slug]` — Individual product page (photos, description, price, add to cart)
- `/cart` — Shopping cart
- `/checkout` — Stripe checkout flow
- `/order-confirmation` — Post-purchase confirmation page
- `/about` — Store story, location, contact info
- `/contact` — Contact form

### Customer Accounts (login required)
- `/account/login` — Sign in or create account
- `/account/register` — New customer registration
- `/account` — Account dashboard (order history, saved address, profile)
- `/account/orders/[id]` — Individual order detail page

### Gallery (public)
- `/gallery` — Browse promo videos and photos uploaded by staff

### Admin (login required)
- Medusa Admin dashboard (`admin.seahorseaquariumsupply.com`)
- Manage products, inventory, orders, customers


---


## Data Models (managed by Medusa.js)

Medusa handles all of these out of the box:

- **Products** — title, description, images, price, stock count, category (fish / coral / equipment)
- **Categories** — fish, coral, equipment
- **Orders** — customer info, line items, payment status, fulfillment status
- **Customers** — name, email, order history
- **Cart** — session-based, no login required to add items


---


## Third-Party Services

| Service | What it does |
|---|---|
| Stripe | Processes credit/debit card payments securely |
| PayPal | PayPal checkout option at payment step |
| Bunny.net | Stores and serves product photos and promo videos via CDN |
| Klaviyo | Email marketing — order confirmations, abandoned cart, newsletters |
| Railway | Hosts the Medusa.js backend and PostgreSQL database |
| Vercel | Hosts the Next.js storefront |


---


## Brand Assets Available

Located in `/WoodysSeahorse/` project root:
- Logos: `Full Logo PNG.png`, `Seahorse Full Logo.png`, `Seahorse Aquarium watermark.png`, multiple SVGs
- Promo videos: multiple `.mp4` files ready to use on homepage


---


## Shipping & Fulfillment Rules

Live animals require special handling at checkout:

| Method | Rule |
|---|---|
| **Shipping** | Only 2-day or faster options shown at checkout (no standard/ground). Display live animal warning at checkout. |
| **Local Pickup** | Available as a free option at checkout. Customer selects pickup, gets notified when ready. |

Shipping carriers that support 2-day: FedEx 2Day, UPS 2nd Day Air, USPS Priority Mail Express. Medusa supports custom shipping options — we will configure only these options for live animal products.

Specific shipping day cutoffs and Saturday delivery rules to be defined before checkout is built.


---


## Employee Mobile App — ReefNerds (Phase 2)

Built after the store is live. Connects to the same Medusa backend on Railway. Lives at `/mobile` in this repo.

### Users and Roles
| Role | Can do |
|---|---|
| **Admin** (owner) | Everything + invite/remove employees |
| **Employee** | Add, edit, delete, publish products; manage inventory. Cannot manage users. |

### Tech Stack
| Layer | Tool |
|---|---|
| Framework | Expo (React Native) + Expo Router |
| Language | TypeScript |
| Backend client | `@medusajs/js-sdk` (same API as desktop admin) |
| Token storage | `expo-secure-store` |
| Image capture | `expo-image-picker` |
| Theme | Dark, matching site branding |
| Distribution | EAS Build → App Store + Play Store |

### Screens
1. **Login** — email + password
2. **Product list** — search, filter by status, thumbnail, price, stock, red low-stock badge, quick stock adjust
3. **Product detail / edit** — title, description, price, inventory count (stepper + direct entry), images, publish toggle, Delete button
4. **New product** — same form blank, image picker from camera or gallery
5. **Team** *(admin-only)* — list employees, invite by email, remove employee

### Inventory Features (daily-deals friendly)
- Quick stock adjust from list screen (+/− without opening full edit)
- Auto marks out-of-stock when count hits 0
- Per-product low-stock threshold (default 3) → red badge on list

### Delete Behavior
- Confirm dialog before delete
- Deletes product from Medusa entirely → disappears from website

### Done Means
- Admin logs in, invites employee → they set password via email link
- Employee logs in on phone → adds low-inventory daily deal (name, price, photo, stock) → publishes → appears on site
- Stock hits 0 → auto marks out-of-stock on site
- Employee deletes product → gone from site
- Admin taps "Remove" on employee → locked out immediately

### Out of Scope (v1)
Orders, customers, discounts, reports, variants (size/color options).

### Role Management (Admin vs Employee)

**Goal:** Owner (admin) can promote or demote any Medusa user between Admin and Employee from inside the Medusa admin dashboard — no redeploy, no env var edits.

**Storage:** Role is saved on each Medusa user in the built-in `metadata` JSON field: `user.metadata.role = 'admin' | 'employee'`. Default (missing) = employee. This uses Medusa's native per-user metadata — no new database tables, no custom module.

**Medusa admin dashboard (web):**
- New widget on the user detail page (`/app/users/:id`)
- Shows current role + dropdown to switch (Admin / Employee)
- Save button calls admin API `POST /admin/users/:id` with `{ metadata: { role: 'admin' } }`
- Visible to logged-in admins only (only admins see the Users page anyway)
- Widget lives in `backend/src/admin/widgets/user-role.tsx`

**Mobile app (ReefNerds):**
- [mobile/lib/auth.tsx](mobile/lib/auth.tsx) `login()` reads `me.metadata?.role` instead of comparing email to `EXPO_PUBLIC_ADMIN_EMAIL`
- `isAdmin` becomes `me.metadata?.role === 'admin'`
- Team tab visibility (already gated on `isAdmin`) works unchanged
- `EXPO_PUBLIC_ADMIN_EMAIL` becomes an optional bootstrap fallback: if a user has no role set yet AND their email matches, treat as admin. This prevents locking yourself out the first time.

**Bootstrap:** One-time script (`backend/src/scripts/seed-admin-role.ts`) that finds the owner user by email and writes `metadata.role = 'admin'`. Run once after deploy, then the dashboard widget takes over.

**Done means:**
- Owner opens Medusa admin → Users → picks an employee → sees role dropdown → changes Employee to Admin → Save → employee opens mobile app → Team tab now visible
- New users default to Employee
- No code changes required to add/remove admins going forward


---


## What "Done" Looks Like

- [ ] Medusa.js backend running on Railway with PostgreSQL
- [ ] Next.js storefront connected to Medusa via Medusa JS SDK
- [ ] Homepage with hero section using existing video/logo assets
- [ ] Shop page with product catalog and category filters
- [ ] Individual product pages with images, price, and add-to-cart
- [ ] Working cart and Stripe checkout
- [ ] Shipping options limited to 2-day or faster when cart has live animals
- [ ] Local pickup option available at checkout
- [ ] Live animal warning shown at checkout
- [ ] Customer account creation, login, order history
- [ ] Order confirmation page
- [ ] Two admin users set up in Medusa admin dashboard
- [ ] `locallfs.com` redirects to `seahorseaquariumsupply.com` via Vercel
- [ ] Gallery page showing promo videos and photos
- [ ] Klaviyo connected — order confirmation and abandoned cart emails live
- [ ] Site deployed to Vercel and connected to custom domain
- [ ] Mobile responsive across all pages
- [ ] **Phase 2:** ReefNerds mobile app (iOS + Android) — admin + employee logins, add/edit/delete products, manage inventory, invite/remove employees


---


## Domains

| Domain | Purpose |
|---|---|
| `www.seahorseaquariumsupply.com` | Primary storefront — all traffic lands here |
| `locallfs.com` | Alias for simplicity — permanently redirects (301) to primary domain |

Both domains already owned. Redirect will be handled at the Vercel level (no code needed).
Medusa admin will live at `admin.seahorseaquariumsupply.com`.


---


## Product Catalog Scale

- **Launch estimate:** 100+ products
- Categories: Fish, Coral, Equipment
- Search and filtering required from day one (by category, price, availability)
- Product import via CSV will be used for initial bulk upload into Medusa admin (faster than entering one by one)


---


## QuickBooks Online — Inventory Sync (Phase 3)

Keep item-level stock counts identical between the physical store (QuickBooks Online) and the website (Medusa). When a sale happens in one place, the other updates within seconds. When staff manually adjust inventory in either place, the other follows.

### Source of truth
There is **no single source of truth** — both sides are authoritative for events that happen on their side. Sync is **event-driven**, not periodic. The SKU is the common identifier.

### Matching products — SKU strategy (Option A)
Products do not yet have SKUs on either side. Before any sync can run:

1. **One-time SKU generation script** (`backend/src/scripts/assign-skus.ts`)
   - Runs against Medusa
   - Every product variant missing a SKU gets one auto-generated from the product handle, e.g. `WS-ELECTRIC-FLAME-SCALLOP-01`
   - Collisions get a numeric suffix
   - Writes SKUs back to Medusa
2. **One-time QuickBooks seed script** (`backend/src/scripts/seed-quickbooks-items.ts`)
   - Reads every Medusa product with its SKU
   - Creates a matching QBO Item (type: Inventory) with that SKU and current stock
   - If a QBO Item with that SKU already exists, updates it instead
3. After both scripts run once, every product has the same SKU in both systems.

### Connection & credentials
- A **new Intuit Developer app** gets created (free, developer.intuit.com). Owner: website developer account.
- The **store's QuickBooks Online account** goes through a one-time OAuth "Connect to QuickBooks" flow hosted on an admin page (`/admin/integrations/quickbooks`).
- Tokens stored encrypted in Medusa backend (new `quickbooks_connection` custom module with `access_token`, `refresh_token`, `realm_id`, `expires_at`). Refresh token auto-rotated before expiry by a scheduled job.

### Live sync flow

**Medusa → QuickBooks**
- Medusa subscriber listens for `inventory.updated` and `order.placed` events
- On event, looks up the variant's SKU, finds the matching QBO Item, calls `POST /items/:id?operation=update` to set `QtyOnHand`
- Retries on failure with exponential backoff (1s → 5s → 30s, then a dead-letter row for manual review)

**QuickBooks → Medusa**
- Intuit webhooks point at `https://admin.seahorseaquariumsupply.com/api/webhooks/quickbooks`
- On `Item` entity change events, the handler fetches the latest item from QBO, looks up the Medusa variant by SKU, and updates `inventory_levels.stocked_quantity`
- Signature verified against the webhook verifier token

### New products created on either side
- **New product in Medusa** → subscriber creates matching QBO Item
- **New item in QuickBooks** → webhook creates matching Medusa product (draft/unpublished so staff can add photos and description before it appears on site)

### Conflict resolution
- "Last write wins" at the SKU level. Timestamps on both sides; if clocks drift we trust the event timestamp we received.
- Simultaneous sales on both sides: both events fire, both decrement, result is correct.
- Simultaneous manual edits on both sides within the same few seconds: last write wins. Rare in practice; acceptable trade-off.

### Admin visibility
A small page at `/admin/integrations/quickbooks` inside the Medusa admin:
- Connect / disconnect button
- Connection status (healthy / token expired / disconnected)
- Last successful sync timestamp
- Recent sync log (last 50 events, green/red)
- Manual "Resync all" button (runs the seed script again, safe to re-run)

### Failure handling
- Every sync attempt logged to `quickbooks_sync_log` table (id, direction, sku, event_type, status, error_message, created_at)
- Failed events retried automatically
- After 3 failed retries, event marked as `needs_manual_review` and shown on the admin page

### Railway environment variables needed (to set BEFORE code is deployed)
| Variable | Value source | What it's for |
|---|---|---|
| `QUICKBOOKS_CLIENT_ID` | Intuit Developer app → Keys & credentials | Identifies our app to Intuit |
| `QUICKBOOKS_CLIENT_SECRET` | Intuit Developer app → Keys & credentials | Secret matching the client ID |
| `QUICKBOOKS_REDIRECT_URI` | `https://admin.seahorseaquariumsupply.com/api/quickbooks/oauth/callback` | Where Intuit sends the user after they authorize |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` during build, `production` at go-live | Tells the SDK which API to hit |
| `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN` | Intuit Developer app → Webhooks tab | Validates incoming webhook signatures |
| `QUICKBOOKS_ENCRYPTION_KEY` | 32-byte random string, we'll generate one | Encrypts OAuth tokens at rest in Postgres |

### Build order (phased)
1. **Phase A — SKUs**
   - Write and run `assign-skus.ts` script
   - Verify every Medusa product has a SKU
2. **Phase B — Developer app + OAuth**
   - User creates Intuit Developer account + app
   - User sets all 6 env vars on Railway
   - Build `/admin/integrations/quickbooks` page with Connect button
   - Test OAuth round-trip in sandbox mode
3. **Phase C — Seed QuickBooks**
   - Run `seed-quickbooks-items.ts` — creates QBO Items for every Medusa product
   - Verify in QuickBooks UI that items appear with correct SKUs and stock
4. **Phase D — Medusa → QBO sync**
   - Subscriber + QBO client library + retry logic + log table
   - Test by adjusting stock in Medusa admin, confirm QBO updates
5. **Phase E — QBO → Medusa sync**
   - Webhook endpoint + signature verification + handler
   - Test by adjusting item in QBO, confirm Medusa updates
6. **Phase F — Admin visibility page**
   - Status, log, resync button
7. **Phase G — Go live**
   - Switch `QUICKBOOKS_ENVIRONMENT` to `production`
   - User re-authorizes with the store's real QBO account
   - Monitor for 48 hours

### Out of scope for v1
- Price sync (prices stay managed in Medusa; QBO prices updated manually or ignored)
- Customer sync (website customers do NOT get pushed to QuickBooks)
- Invoice / sales receipt creation in QuickBooks when website orders complete (can be added later)
- Multi-location inventory (QBO Plus feature; both sides treat stock as single-location)

### Done means
- Sale at the register in QuickBooks → website stock count drops within 30 seconds
- Sale on the website → QuickBooks stock count drops within 30 seconds
- Manual stock adjustment in either system → other side catches up within 30 seconds
- Admin page shows "Connected, last sync 2 min ago" in green
- Token refresh happens silently in background with no user action
- If the connection breaks, the admin page shows red and exactly what to do to fix it
