# AI Support Chatbot Implementation Plan

> **For agentic workers:** This plan is being executed inline in one pass (user requested "all phases in one go"). Steps use checkbox (`- [ ]`) syntax for tracking. Spec: `project_specs.md` → "AI Support Chatbot (Phase 5)".

**Goal:** Add a free, customer-facing chat bubble to the storefront that answers questions about product stock, the customer's orders (logged-in or verified guest), and store basics — powered by a free-tier AI brain.

**Architecture:** A client `ChatWidget` posts the conversation (plus the logged-in customer's Medusa token, if any) to a new `app/api/chat` route. The route runs a Groq chat model in a server-side tool-calling loop. The model can call four server-run tools that read live data from Medusa (`x-publishable-api-key` + the customer's bearer token for their own orders). The model only states facts the tools return. The route replies with JSON; the widget shows a typing indicator then renders the reply.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · `groq-sdk` (new) · Medusa Store REST API.

## Global Constraints

- Dark, premium UI. No emoji icons (use inline SVG). No inline styles. No generic gradients. (CLAUDE.md Design)
- AI provider key is server-only (`GROQ_API_KEY`); never sent to the browser.
- Order details returned ONLY for the logged-in customer (their own token) or a guest who passes order-id + email verification — enforced server-side, never by trusting chat text.
- The model must not invent stock or order facts; if a tool returns nothing, say so and point to `info@seahorseaquariumsupply.com`.
- Testing per CLAUDE.md: `npm run build` must pass + manual verification in the browser. No unit-test framework exists in this repo, so no unit tests are added.
- `console.log` at start and end of the API route.
- Reuse proven Medusa field sets from `app/account/page.tsx` and `components/SideScrollGallery.tsx` to avoid 400s.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/chat/store-info.ts` | Curated store facts (shipping, returns, hours, location, care) + `getStoreInfo(topic)`. Editable constants. |
| `lib/chat/medusa-server.ts` | Server-side Medusa Store REST helpers: `searchProducts`, `listCustomerOrders(token)`, `retrieveOrder(id)`. |
| `lib/chat/tools.ts` | Groq tool definitions (`TOOL_DEFS`) + `runTool(name, args, ctx)` dispatcher returning a string for the model. |
| `lib/chat/system-prompt.ts` | `SYSTEM_PROMPT` — role, scope, guardrails. |
| `app/api/chat/route.ts` | `POST` handler: Groq tool loop, returns `{ reply }`. |
| `components/ChatWidget.tsx` | Client bubble + panel, quick replies, typing indicator; reads `medusa_auth_token`, posts to `/api/chat`. |
| `app/layout.tsx` | Mount `<ChatWidget />` once (modify). |

---

### Task A: Widget shell + endpoint skeleton

**Files:** Create `app/api/chat/route.ts`, `components/ChatWidget.tsx`, `lib/chat/system-prompt.ts`; Modify `app/layout.tsx`; add `groq-sdk` dependency.

- [ ] Install `groq-sdk`.
- [ ] `route.ts`: parse `{ messages, customerToken }`; if `GROQ_API_KEY` missing, return a friendly "not configured yet" reply (so the site never breaks pre-key); otherwise call Groq once (no tools yet) and return `{ reply }`. `console.log` start/end.
- [ ] `ChatWidget.tsx`: floating button + panel, message list, input, typing dots; posts to `/api/chat`.
- [ ] Mount `<ChatWidget />` in `app/layout.tsx` inside `AuthProvider`.
- [ ] Verify: `npm run build` passes.

### Task B: Store info + system prompt + guardrails

**Files:** Create `lib/chat/store-info.ts`, `lib/chat/tools.ts`; flesh out `system-prompt.ts`; wire tools into `route.ts`.

- [ ] `store-info.ts`: location (106 NE Russet St, Portland OR 97211), shipping (2-day-or-faster live-animal rule + free local pickup), returns/hours as honest editable defaults that point to contact, general care guidance. `getStoreInfo(topic)`.
- [ ] `tools.ts`: define `get_store_info` tool + dispatcher.
- [ ] `route.ts`: add the tool loop (max 5 rounds) and pass `TOOL_DEFS`.
- [ ] `system-prompt.ts`: scope to orders/stock/store-info, guardrails, decline off-topic, never invent.
- [ ] Verify: build passes; bot answers shipping/returns/hours/location/care and declines off-topic.

### Task C: Stock lookup

**Files:** Modify `lib/chat/medusa-server.ts` (`searchProducts`), `lib/chat/tools.ts` (`check_stock`).

- [ ] `searchProducts(query)`: `GET /store/products?q=…&limit=5&fields=id,title,handle,*variants.calculated_price,variants.manage_inventory,variants.inventory_quantity,variants.allow_backorder&region_id=…` (region from `/store/regions`, cached). Compute in-stock (in stock if any variant has `manage_inventory===false` OR `inventory_quantity>0`).
- [ ] `check_stock` tool returns top matches with name, price, in/out of stock.
- [ ] Verify: build passes; "is X in stock?" returns live availability.

### Task D: Order lookups

**Files:** Modify `lib/chat/medusa-server.ts` (`listCustomerOrders`, `retrieveOrder`), `lib/chat/tools.ts` (`get_my_orders`, `lookup_guest_order`), `ChatWidget.tsx` (send token).

- [ ] `listCustomerOrders(token)`: `GET /store/orders?fields=id,display_id,created_at,total,status,*items&limit=10` with `Authorization: Bearer <token>`.
- [ ] `retrieveOrder(id)`: `GET /store/orders/{id}?fields=id,display_id,created_at,total,status,email,*items`.
- [ ] `get_my_orders` tool: uses `ctx.customerToken`; if absent, returns "not signed in — sign in or give me your order number + email."
- [ ] `lookup_guest_order(order_id, email)`: retrieve, compare `order.email` (case-insensitive) to `email`; return summary only on match, else "couldn't verify."
- [ ] `ChatWidget` sends `customerToken: localStorage.getItem("medusa_auth_token")`.
- [ ] Verify: build passes; logged-in order status works; guest verified works; mismatch refused.

### Task E: Polish

**Files:** `components/ChatWidget.tsx`.

- [ ] Dark premium styling matching the site (ocean bg, white/10 borders, glow, gold accents), quick-reply chips, error + rate-limit messages, mobile-responsive panel, aria labels, Enter-to-send.
- [ ] Verify: build passes; looks on-brand on desktop + mobile widths.

### Task F: Build + deploy

- [ ] `npm run build` passes clean.
- [ ] Commit + push to `master` (Vercel auto-deploys).
- [ ] Report the one manual step: create a free Groq key and add `GROQ_API_KEY` in Vercel.

---

## Out of Scope (v1)

Product recommendations / add-to-cart, chat history persistence, admin/staff bot, live human handoff, multiple languages, token-by-token streaming, fulfillment tracking numbers.
