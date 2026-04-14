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


## Employee Mobile App (Phase 2)

Built after the store is live. Connects to the same Medusa backend.

| Feature | Detail |
|---|---|
| Platform | iOS + Android (React Native + Expo) |
| Auth | Employee login — same admin credentials as Medusa |
| Product photo upload | Take or select photos → attach directly to a product listing |
| Promo video upload | Record or select video → publishes to the `/gallery` page on the website |
| Storage | All uploads go to Bunny.net |


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
- [ ] **Phase 2:** React Native employee app (iOS + Android) for photo/video uploads


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
