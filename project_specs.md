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


---


## Live Auctions (Phase 4)

Timed English-style auctions for live fish, corals, and invertebrates. Customers bid publicly, the highest bid above reserve wins, winner pays within 24 hours or the offer cascades to the next bidder.

### Who uses it
- **Shoppers** — browse open auctions, place bids, track their active bids, pay after winning
- **Admin/staff** — create auctions, set reserves, monitor live bidding, handle no-pay cascades

### Rules (confirmed)
| Rule | Value |
|---|---|
| Auction type | English (ascending public bids) |
| Reserve price | Yes — hidden from bidders, auction only sells if met |
| Starting bid | Staff-set per auction |
| Bid increment | Staff-set per auction (default $5) |
| Soft close | Yes — if any bid lands in the final 2 minutes, end time extends by 2 minutes. Repeats indefinitely. |
| Payment model | Card on file at bid time (Stripe SetupIntent — no hold). Charged after winning. |
| Pay window | 24 hours after auction ends |
| No-pay fallback | Cascade to 2nd-highest bidder at **their** bid amount, 24-hr window. Cascade again to 3rd if needed. If top 3 all fail, auction relists. |
| Ghost policy | 1st ghost = warning email. 2nd ghost = banned from future auctions. Tracked on customer metadata. |
| Eligibility to bid | Logged-in customer + saved card on file. No unverified bidding. |
| Location | Anyone can bid regardless of shipping distance. Same live-animal shipping rules apply. |

### Tech stack additions
| Piece | Choice | Why |
|---|---|---|
| Realtime bid updates | **Polling** — 3s while auction has <2 min left, 10s otherwise | No new infra, good enough for single-digit concurrent bidders per auction. Upgrade to Pusher/Ably later if load demands it. |
| Countdown timer | Server-authoritative end time, client computes remaining | Prevents clock-skew sniping |
| Card storage | Stripe Customer + SetupIntent + default PaymentMethod | Already using Stripe, no hold at bid time = no statement friction |
| Scheduled jobs | Medusa scheduled jobs (already used for `expire-new-arrivals`) | Close auctions, charge winners, cascade on no-pay |
| Emails | Klaviyo (already wired) | Outbid, won, payment due, cascade offer, banned |

### Data Models (new Medusa module: `auctions`)

```
auction
├── id
├── product_id          → existing Medusa product (1-of-1 inventory)
├── status              → scheduled | live | ended | cancelled | relisted
├── starts_at           → when bidding opens
├── ends_at             → current end time (moves with soft close)
├── original_ends_at    → initial end time (unchanged, for records)
├── starting_bid        → cents
├── bid_increment       → cents (default 500 = $5)
├── reserve_price       → cents, nullable
├── reserve_met         → boolean (cached for fast queries)
├── current_high_bid_id → nullable FK to bid
├── winner_customer_id  → nullable FK
├── winner_offer_status → pending_payment | paid | forfeited | cascaded
├── cascade_position    → 1 | 2 | 3 (which bidder was offered after forfeit)
├── metadata
├── created_at / updated_at

bid
├── id
├── auction_id          → FK
├── customer_id         → FK (must have saved card)
├── amount              → cents
├── status              → active | outbid | winning | forfeited
├── created_at

auction_customer_profile    (extends Medusa customer via metadata)
├── stripe_customer_id
├── saved_payment_method_id
├── ghost_count             → 0, 1, 2+
├── banned_from_auctions    → boolean
├── first_ghost_at
```

### Pages and flows

**Public (logged-out)**
- `/auctions` — Live + upcoming auctions grid. Shows countdown, current bid, image. Clicking a card = product page.
- `/auctions/[id]` — Auction detail. Photo gallery, countdown, current high bid, bid history (anonymized: "bidder_7f4a"), bid form (disabled with "Sign in to bid" CTA).

**Customer (logged-in)**
- `/auctions/[id]` — Same as above, but bid form active. First bid prompts "Save a card to bid" → Stripe SetupIntent flow → returns and places bid.
- `/account/bids` — Active bids, won auctions pending payment, past wins, losses. Big "Pay now" button on pending-payment rows.
- `/account/payment-methods` — Add/remove/default cards (Stripe Billing portal or custom UI).
- Email: outbid notifications, "you won" + pay link, 24-hr countdown reminder at 12-hr and 2-hr marks, cascade offers.

**Admin**
- `/admin/auctions` (Medusa admin custom route) — List all auctions (live, scheduled, ended). Filters by status.
- `/admin/auctions/new` — Pick an existing product, set start/end, reserve, starting bid, increment.
- `/admin/auctions/[id]` — View bid history with real customer names/emails, manual close button, manual cascade override (force offer to Nth bidder), mark as paid/forfeited, cancel auction.
- Customer detail widget — shows ghost count + ban toggle.

### User flows

**First-time bidder**
1. Logged-in customer on `/auctions/[id]` clicks "Place Bid: $X"
2. Modal: "Save a card to bid. Your card won't be charged unless you win."
3. Stripe SetupIntent flow → card saved as default PaymentMethod on Stripe Customer
4. Bid placed. Badge next to name: "Verified bidder"
5. Outbid? Email sent. Card stays saved for next auction.

**Soft close**
1. Auction end time = 8:00 PM
2. At 7:59 PM someone bids → end time pushed to 8:01 PM
3. Countdown visibly jumps on all clients on next poll
4. Keeps extending until 2 full minutes pass with no bids

**Won the auction**
1. Auction closes at 8:05 PM with reserve met
2. Scheduled job runs every 60s, picks up closed auctions, marks winner, fires Klaviyo "You won!" email with Stripe Checkout pay link
3. Pay link is a one-time Stripe PaymentIntent pre-filled with saved card, customer reviews shipping + taxes, confirms, done
4. 12-hr and 2-hr reminder emails if unpaid
5. At T+24hr unpaid → winner marked forfeited, ghost_count++, email sent, cascade starts

**Cascade**
1. Scheduled job sees `winner_offer_status = pending_payment` past 24hr OR payment failed
2. Marks winner as forfeited, bumps ghost_count
3. If ghost_count hits 2 → sets `banned_from_auctions = true`
4. Finds 2nd-highest active bid, sets as new winner at **their** bid amount, starts fresh 24-hr clock, emails them
5. Repeats up to 3rd bidder
6. If all 3 forfeit → admin gets email, auction status = `relisted`, staff manually creates new auction

**Ghost / ban**
- Warning email after 1st no-pay: "This time it's a warning. Next time = banned."
- Ban auto-applied on 2nd no-pay. Customer can still shop the regular storefront, just can't bid.
- Admin widget on customer detail can manually unban (forgive an edge case).

### Third-party service additions
| Service | What it does |
|---|---|
| Stripe SetupIntent API | Save card at bid time without charging |
| Stripe PaymentIntent (manual) | Charge winner when they hit "Pay now" |
| Klaviyo | All auction lifecycle emails (outbid, won, reminder, cascade offer, banned) |

### Build order (phased)

1. **Phase A — Auctions module + data models**
   - New Medusa custom module `auctions` with migrations for `auction`, `bid` tables
   - Customer metadata fields for ghost tracking
   - Admin API routes (create, list, cancel)

2. **Phase B — Saved card flow**
   - `/account/payment-methods` page + Stripe SetupIntent integration
   - Require saved card before first bid

3. **Phase C — Bidding**
   - Public auction detail page with countdown + bid form
   - Bid API route (validate: eligible, amount ≥ current + increment, auction live, not banned)
   - Soft-close logic on bid placement
   - Polling cadence (3s late, 10s early)
   - Anonymized bid history

4. **Phase D — Auction close + winner notify**
   - Scheduled job every 60s: close expired auctions, mark winner if reserve met, fire Klaviyo email with pay link
   - Pay page (`/auctions/[id]/pay`) → PaymentIntent with saved card

5. **Phase E — Cascade + ghost tracking**
   - Scheduled job: detect expired pay windows, forfeit, bump ghost count, cascade to next bidder
   - Auto-ban on 2nd ghost
   - Admin override widget

6. **Phase F — Admin UI**
   - `/admin/auctions` list + detail + create pages as custom routes
   - Customer widget showing ghost count + ban toggle

7. **Phase G — Public polish**
   - `/auctions` index page
   - Homepage row (when there's at least one live auction)
   - `/account/bids` dashboard
   - Klaviyo email templates for every lifecycle event

### Done means
- Admin creates an auction from a product with 1 stock, sets $20 reserve, $10 starting bid, 4-hour duration
- Customer signs in, lands on `/auctions/[id]`, sees countdown
- Customer tries to bid → prompted to save card → SetupIntent flow completes → bid placed
- Second customer bids higher → first customer gets outbid email via Klaviyo
- Final minute activity extends end time via soft close
- Auction ends with reserve met → winner gets "You won!" email within 60 seconds with pay link
- Winner pays via saved card → order created in Medusa with same live-animal shipping rules as storefront
- If winner doesn't pay in 24 hrs → 2nd place gets cascade offer at their bid price
- After 2nd ghost, customer is auto-banned from future auctions (but can still shop normally)
- Admin dashboard shows live bid feed with real identities and manual override buttons

### Out of scope (v1)
- Proxy/max bidding (eBay-style "bid up to $X automatically")
- Watchlists / save-for-later
- Buy-it-now option on auctions
- Bid retraction
- Auction extensions beyond 2 min (e.g. 5-min soft close variant per auction)
- Public reserve indicator ("reserve met ✓") — can add later
- Push notifications (use email only for v1)


---


## AI Support Chatbot (Phase 5)

A free, AI-powered chat bubble on the public storefront that answers customer questions about **their orders**, **product stock**, and **store basics** (shipping, returns, hours, location, livestock care). It feels like a real AI assistant but runs on a free AI tier — no per-message cost.

### Who uses it
- **Shoppers (logged-in or guest)** — ask "where's my order?", "is X in stock?", "do you ship live coral?" from any storefront page.
- Customer-facing only in v1 — there is no admin/staff bot.

### The "brain" — free-tier AI
| Piece | Choice | Why |
|---|---|---|
| AI provider | **Groq free tier** (recommended) | Free, fast, supports tool calling, and its API does **not** train on your messages — important because order lookups touch customer emails. |
| Alternative | Google Gemini free tier | Slightly higher quality, but its *free* tier may use messages to improve their models — only chosen if the privacy terms are acceptable. |
| Upgrade path | Swappable to paid Claude (`@anthropic-ai/sdk`) later | One change to the "brain"; everything else stays the same. |
| Key storage | Provider API key as a Vercel environment variable (e.g. `GROQ_API_KEY`) | Secret stays server-side, never in the browser. No credit card needed for the free tier. |

Free tiers have daily / per-minute limits. Fine for the store's volume; a big traffic spike could briefly pause the bot, in which case it shows a polite "back in a moment" message instead of breaking. Exact current limits and privacy terms will be confirmed against the provider's official docs before building.

### How it works
1. A chat bubble (client component, dark theme to match the site) sits on every storefront page.
2. Messages POST to a new private endpoint, `app/api/chat/route.ts`.
3. The route sends the conversation + a set of **lookup tools** to the AI brain. The AI decides which tool to call; **our server runs the lookup** (against Medusa) and returns the result; the AI phrases the answer; the reply **streams** back to the bubble.
4. The AI can only state facts the lookups return — it cannot invent stock numbers or order details.

### Lookup tools (run server-side)
| Tool | What it does | Data source | Who can use it |
|---|---|---|---|
| `checkStock` | Finds a product by name and reports availability / price | Medusa store products + inventory (publishable key) | Anyone |
| `getMyOrders` | Returns the **logged-in** customer's own orders + status / tracking | Medusa store orders, scoped by the customer's session token | Logged-in only |
| `lookupGuestOrder` | Looks up one order by order number, **only after** the supplied email matches that order's email | Medusa order lookup, verified on the server | Guest, after verification |
| `getStoreInfo` | Answers shipping, returns, hours, location, and livestock-care questions | Small store-info file kept in the repo | Anyone |

### Privacy & safety
- The AI provider key lives only on the server (Vercel env var), never shipped to the browser.
- Order details are returned **only** for the logged-in shopper, or a guest who proves the order number + email match — enforced in our server code, never by trusting the chat text.
- We use an AI provider whose API does not train on messages, so customer order data isn't reused.
- The system prompt keeps the bot to orders / stock / store-info, tells it to never guess, and to point to the contact page when a lookup finds nothing or a question is out of scope.

### Pages and files (new)
- `components/ChatWidget.tsx` (and small sub-components) — the bubble + chat panel, client component, dark premium styling, with quick-reply suggestions ("Track my order", "Check stock", "Shipping & returns").
- `app/api/chat/route.ts` — server endpoint: talks to the AI brain, runs the tools, streams the reply. (`console.log` at start and end, per project rules.)
- `lib/chat/` — small helpers for the AI client and the four tool functions that call Medusa.
- `lib/chat/store-info.ts` — the curated shipping / returns / hours / location / care content.
- Mounted once in the storefront layout so the bubble appears on every public page.

### Build order (phased)
1. **Phase A — Widget + endpoint skeleton.** Chat bubble UI + `/api/chat` route that streams a plain reply from the free AI brain (no tools yet). User adds `GROQ_API_KEY` on Vercel first. Confirms the brain + key + streaming work.
2. **Phase B — Store info + guardrails.** Add the `getStoreInfo` tool, system prompt, and scope guardrails. Bot answers shipping / returns / hours / care and politely declines off-topic questions.
3. **Phase C — Stock lookups.** Add `checkStock` against Medusa. "Is X in stock?" returns live availability.
4. **Phase D — Order lookups.** Add `getMyOrders` (logged-in) and `lookupGuestOrder` (order # + email verification). Privacy enforced server-side.
5. **Phase E — Polish.** Dark styling pass, quick-reply buttons, error / rate-limit messages, mobile, accessibility.
6. **Phase F — Deploy + verify.** Push to Vercel, verify end-to-end on the live domain (logged-in order, guest verified order, stock, FAQ, off-topic decline, key not exposed).

### Out of scope (v1)
- Product recommendations or "add to cart" from chat
- Saved chat history / database persistence
- Admin / staff assistant bot
- Live human handoff
- Multiple languages

### Done means
- The dark chat bubble opens on the storefront.
- A logged-in customer asks "where's my order?" and gets their real order status / tracking.
- A guest gets their order status after providing a matching order number + email (and is refused if they don't match).
- Anyone gets accurate, live "is X in stock?" answers.
- Common store questions (shipping, returns, hours, location, care) are answered.
- Off-topic questions get a friendly redirect, and the bot never invents stock or order info.
- The AI key is not exposed in the browser, `npm run build` passes, and there are no console errors.

## Google Product Visibility (Phase 6)

**Goal:** When someone searches Google for a fish, coral, or supply we carry, our product shows in the results.

**Already in place (verified):** Product + Breadcrumb JSON-LD on every product page, canonical URLs, OpenGraph, sitemap.xml including every product.

**A. Merchant Center product feed (code)**
- New route: `GET /api/merchant-feed` — Google Shopping RSS 2.0 XML.
- **Supplies only.** Live animals (fish/corals/inverts) are excluded — Google suspends Merchant accounts for live animals in feeds (documented cases). Filter: products in the `supplies` category.
- Fields per item: `g:id` (variant SKU), `g:title`, `g:description`, `g:link` (product URL), `g:image_link`, `g:price` (USD), `g:availability` from real stock, `g:condition` new, `g:brand`, `g:gtin` when the variant has a scanned UPC else `g:identifier_exists=false`, `g:google_product_category` = Animals & Pet Supplies > Pet Supplies > Fish Supplies.
- Cached ~1h; served from the storefront (Vercel).

**B. Truthful availability in product JSON-LD (code)**
- Product-page schema currently hardcodes `InStock`. Use real variant stock: `InStock` / `OutOfStock` (Google penalizes mismatches).

**C. User-run steps (walked through)**
1. Google Search Console: verify www.seahorseaquariumsupply.com, submit /sitemap.xml → all products (fish included) become indexable in regular Google Search. This is the path for livestock searches.
2. Google Merchant Center: create free account, add feed URL → supplies appear in Google Shopping free listings.

**Done means:** feed URL validates in Merchant Center with 0 errors; a supply product appears in the Shopping tab; Search Console shows the sitemap accepted; product pages pass Google's Rich Results test with correct availability.

## Structured Size Variants + Free-Shipping Eligibility (Phase 7)

Full design: `docs/superpowers/specs/2026-07-26-size-variants-free-shipping-design.md`

**Goal:** One product page per fish/coral/supply with a Size dropdown — each size
is a Medusa variant with its own price, optional sale price, SKU, UPC/barcode,
stock, and its own QuickBooks item. Free shipping applies only to live Fish and
Coral; Supplies never qualify, never count toward the $500 threshold, and never
show the badge.

**Key points**
- Size system chosen per product (`metadata.size_system`: fish | coral | supply).
  Fish: Tiny → Show (7 fixed, ordered). Coral: ½" → 6" then Colony (13 fixed,
  ordered). Supply: Small/Medium/Large + custom sizes (`100 ml`, `25 count`, …),
  staff-reorderable. Never alphabetized.
- Admin: new "Size Variants" widget on the product page backed by
  `POST /admin/size-variants/:productId` (core workflows, so QuickBooks
  auto-create still fires per variant; duplicate sizes/SKUs rejected visibly).
- Storefront: `Select size…` required before add-to-cart, `From $X` pricing,
  out-of-stock sizes disabled (product hidden only when ALL sizes are out),
  sale price shown struck-through.
- Free shipping enforced at checkout in the Shippo provider: live Fish/Coral
  subtotal ≥ $500 → live portion free; mixed carts still charge the supplies
  shipment; classification by category/tags/metadata — never product title.
- Migration safety: nothing auto-converted; read-only report script
  (`backend/src/scripts/size-variant-report.ts`) lists multi-variant products,
  likely duplicate size listings, and SKU/UPC/QBO conflicts before any manual
  consolidation is approved.

**Done means:** vitest suites pass on both packages (size ordering, planning
core, free-shipping decisions, QBO per-variant mapping, storefront contracts);
`npm run build` + `medusa build` pass; deliverables include the changed-file
diff, affected-page list, and a worked mixed-cart shipping example.
