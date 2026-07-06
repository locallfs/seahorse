// Single source of truth for core store facts used by both the SEO structured
// data (components/StructuredData.tsx) and the chatbot (lib/chat/store-info.ts).
// Update hours, phone, and address here — both places pick it up.

export const STORE_NAME = "Woody's Seahorse Aquarium & Supply";
export const STORE_PHONE = "503-283-4788";
export const STORE_EMAIL = "info@seahorseaquariumsupply.com";

export const STORE_ADDRESS = {
  street: "106 NE Russet St",
  city: "Portland",
  region: "OR",
  postalCode: "97211",
  country: "US",
};

// Structured hours for schema.org OpeningHoursSpecification (24-hour times).
export const STORE_OPENING_HOURS = [
  {
    dayOfWeek: ["Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "12:00",
    closes: "19:00",
  },
  { dayOfWeek: "Sunday", opens: "12:00", closes: "18:00" },
];

// Human-readable hours for the chatbot and any plain-text use.
export const STORE_HOURS_TEXT =
  "Wednesday–Saturday 12:00 PM to 7:00 PM, and Sunday 12:00 PM to 6:00 PM. Closed Monday and Tuesday.";
