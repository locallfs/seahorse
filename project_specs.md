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
