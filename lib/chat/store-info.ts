// Curated store facts the chatbot is allowed to share. The bot only repeats
// what is written here — it never invents store info. Edit these to match the
// real store details (especially HOURS and RETURNS, marked below).

export const STORE_NAME = "Woody's Seahorse Aquarium & Supply";
export const STORE_EMAIL = "info@seahorseaquariumsupply.com";

const LOCATION = `${STORE_NAME} is located at 106 NE Russet St., Portland, Oregon 97211. The shop is on the gravel street (Rodney) around the corner. We've been Portland's saltwater fish and coral specialist since 1996.`;

// TODO(owner): replace with your real opening hours.
const HOURS = `For today's store hours, please email ${STORE_EMAIL} and we'll confirm right away.`;

const SHIPPING = `We ship live animals 2-day or faster only (FedEx 2Day, UPS 2nd Day Air, or USPS Priority Mail Express) so they arrive healthy — there is no standard or ground shipping on livestock. Free local pickup is available at checkout, and a live-animal handling notice is shown before you pay.`;

// owner: adjust to your real dead-on-arrival / returns policy.
const RETURNS = `Live animals are delicate, so returns are handled case by case. If something arrives dead or unwell, email ${STORE_EMAIL} as soon as possible (the same day if you can) with your order number and a photo, and our team will make it right.`;

const CARE = `A few general tips: acclimate new livestock slowly (float or drip-acclimate to match temperature and water chemistry), keep your tank parameters stable, and quarantine new fish when you can. For species-specific care, ask our staff or email ${STORE_EMAIL}.`;

const GENERAL = `${STORE_NAME} is Portland, Oregon's saltwater fish, coral, and aquarium supply specialist since 1996. I can help with order status, product stock, shipping, returns, hours, location, and basic care. For anything else, email ${STORE_EMAIL}.`;

export type StoreInfoTopic =
  | "shipping"
  | "returns"
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
