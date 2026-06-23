// Curated store facts the chatbot is allowed to share. The bot only repeats
// what is written here — it never invents store info. This content mirrors the
// live site: /shipping-returns, the structured-data hours, and /care. Keep it
// in sync if those pages change.

export const STORE_NAME = "Woody's Seahorse Aquarium & Supply";
export const STORE_EMAIL = "info@seahorseaquariumsupply.com";
export const STORE_PHONE = "503-283-4788";

const LOCATION = `${STORE_NAME} is at 106 NE Russet St., Portland, Oregon 97211 — on the gravel street (Rodney) around the corner. We've been Portland's saltwater fish and coral specialist since 1996. Phone: ${STORE_PHONE}. Free local pickup is available during open hours.`;

const HOURS = `Store hours (Pacific time): Wednesday–Saturday 12:00 PM to 7:00 PM, and Sunday 12:00 PM to 6:00 PM. Closed Monday and Tuesday. Phone: ${STORE_PHONE}.`;

const SHIPPING = `Shipping methods:
- Live animals (fish, corals, inverts): UPS or FedEx Priority Overnight only — we do not ship livestock ground or two-day.
- Dry goods (equipment, supplies, salt mix): USPS, UPS, or FedEx ground, two-day, or overnight.
- Free shipping on orders totaling $500 or more, applied automatically at checkout.
- Free local pickup at 106 NE Russet St., Portland, OR 97211 during open hours.
Handling and ship dates:
- Live animal orders ship Monday–Wednesday; orders placed after 12:00 PM PT Wednesday ship the following Monday.
- We don't ship live animals before/on major holidays or when temperatures are unsafe — you'll be emailed about any hold.
- Handling fee at checkout: $7 for supplies-only orders, $12 for orders containing live animals.
- Livestock shipping requires a $99 minimum order. We do not ship to Hawaii, Alaska, Puerto Rico, or internationally.
Full details are on the Shipping & Returns page (/shipping-returns).`;

const GUARANTEE = `Live Arrival Guarantee: all coral purchases include a 1-day Live Arrival Guarantee. If an item arrives dead (DOA), follow these steps so the claim can be processed:
1. Take clear, high-resolution photos of the deceased livestock within 2 hours of the carrier's posted delivery time (unclear or "all blue" photos can't be accepted).
2. Email the photos and your order information to ${STORE_EMAIL}.
3. Keep the specimen — don't discard it until we respond, since we may need the skeleton returned.
Approved claims are refunded as store credit for the value of the affected animal(s). Shipping fees are non-refundable. The guarantee does not cover carrier delays after the first delivery attempt, missed delivery windows, refused or un-retrieved packages, or animals that die after successful acclimation. Full details: /shipping-returns.`;

const RETURNS = `Returns:
- Dry goods: new, UNOPENED items may be returned within 30 days of delivery for a refund to the original payment method. Opened merchandise cannot be returned and items must be in their original unopened packaging with all accessories. A 20% restocking fee applies to returned supplies, and return shipping is the customer's responsibility unless the item arrived defective or was shipped in error.
- Live animals: final sale — they cannot be returned once delivered (including for tank-compatibility issues, change of mind, or inadequate care). Livestock issues are handled only under the Live Arrival Guarantee (DOA).
To start a return, email ${STORE_EMAIL} with your order number and a brief description of the issue; we reply within one business day. Full details: /shipping-returns.`;

const CARE = `General care tips: acclimate new livestock slowly (float or drip-acclimate to match temperature and water chemistry), keep your tank parameters stable, and quarantine new fish when you can. For species-specific guidance, see our care guide (/care), ask our staff, call ${STORE_PHONE}, or email ${STORE_EMAIL}.`;

const GENERAL = `${STORE_NAME} is Portland, Oregon's saltwater fish, coral, and aquarium supply specialist since 1996. I can help with order status, product stock, shipping, returns, the live arrival guarantee, hours, location, and basic care. Call ${STORE_PHONE} or email ${STORE_EMAIL} for anything else.`;

export type StoreInfoTopic =
  | "shipping"
  | "returns"
  | "guarantee"
  | "hours"
  | "location"
  | "care"
  | "general";

export function getStoreInfo(topic: StoreInfoTopic): string {
  switch (topic) {
    case "shipping":
      return SHIPPING;
    case "returns":
      return RETURNS;
    case "guarantee":
      return GUARANTEE;
    case "hours":
      return HOURS;
    case "location":
      return LOCATION;
    case "care":
      return CARE;
    default:
      return GENERAL;
  }
}
