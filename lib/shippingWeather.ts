/**
 * Live shipping-conditions weather for whoever is visiting the site.
 *
 * Location comes from the request itself — Vercel attaches geo headers to every
 * edge request, so there is no API key, no browser permission prompt and no
 * extra round trip. Once a customer has entered a shipping address we prefer
 * that postal code instead, because that is where the animals are actually
 * going.
 *
 * Thresholds mirror the backend's livestock configuration
 * (`backend/src/modules/fulfillment-shippo/livestock-config.js`), which stays
 * the source of truth for what actually gets charged and packed. This copy only
 * drives what the visitor is *told*; keep the two in step when you retune.
 */

export const SHIPPING_WEATHER_THRESHOLDS = {
  coldThresholdF: 50,
  hotThresholdF: 85,
  hardFreezeF: 25,
  extremeHeatF: 100,
} as const;

export type ThermalMode = "none" | "heat" | "cold";

export type ShippingWeatherVerdict = {
  thermal: ThermalMode;
  hold: boolean;
  headline: string;
  detail: string;
  severity: "ok" | "caution" | "hold";
};

export type VisitorLocation = {
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "address" | "request" | "store-fallback";
};

/** Headers Vercel sets on every request. Absent in local dev. */
export function readVisitorLocation(headers: Headers): VisitorLocation | null {
  const get = (k: string) => {
    const v = headers.get(k);
    return v && v.trim() ? decodeURIComponent(v.trim()) : null;
  };

  // Number(null) is 0, which is a perfectly finite point in the Gulf of
  // Guinea — so a missing header must become NaN, not a location.
  const latRaw = get("x-vercel-ip-latitude");
  const lonRaw = get("x-vercel-ip-longitude");
  const lat = latRaw === null ? NaN : Number(latRaw);
  const lon = lonRaw === null ? NaN : Number(lonRaw);
  const city = get("x-vercel-ip-city");
  const postalCode = get("x-vercel-ip-postal-code");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    // No usable coordinates — caller decides what to do.
    if (!postalCode && !city) return null;
    return {
      city,
      region: get("x-vercel-ip-country-region"),
      postalCode,
      country: get("x-vercel-ip-country"),
      latitude: null,
      longitude: null,
      source: "request",
    };
  }

  return {
    city,
    region: get("x-vercel-ip-country-region"),
    postalCode,
    country: get("x-vercel-ip-country"),
    latitude: lat,
    longitude: lon,
    source: "request",
  };
}

/**
 * Turn temperatures into something a customer can act on.
 *
 * Deliberately reassuring by default: the common case is "we pack for this",
 * not a warning. Only genuine extremes mention a hold.
 */
export function describeShippingWeather(
  minF: number | null,
  maxF: number | null,
  placeLabel: string | null,
  t = SHIPPING_WEATHER_THRESHOLDS,
): ShippingWeatherVerdict {
  const where = placeLabel ? `in ${placeLabel}` : "at your delivery area";

  if (typeof minF === "number" && minF <= t.hardFreezeF) {
    return {
      thermal: "heat",
      hold: true,
      severity: "hold",
      headline: `Hard freeze ${where}`,
      detail:
        `Lows near ${Math.round(minF)}°F are below what a heat pack can safely cover. ` +
        `Live orders may be held until conditions improve — we'll contact you before shipping.`,
    };
  }

  if (typeof maxF === "number" && maxF >= t.extremeHeatF) {
    return {
      thermal: "cold",
      hold: true,
      severity: "hold",
      headline: `Extreme heat ${where}`,
      detail:
        `Highs near ${Math.round(maxF)}°F are above what a cold pack can safely cover. ` +
        `Live orders may be held until conditions improve — we'll contact you before shipping.`,
    };
  }

  if (typeof minF === "number" && minF <= t.coldThresholdF) {
    return {
      thermal: "heat",
      hold: false,
      severity: "caution",
      headline: `Heat pack included`,
      detail:
        `Lows near ${Math.round(minF)}°F ${where}, so live orders ship with an insulated ` +
        `box and a heat pack at no extra cost.`,
    };
  }

  if (typeof maxF === "number" && maxF >= t.hotThresholdF) {
    return {
      thermal: "cold",
      hold: false,
      severity: "caution",
      headline: `Cold pack included`,
      detail:
        `Highs near ${Math.round(maxF)}°F ${where}, so live orders ship with an insulated ` +
        `box and a cold pack at no extra cost.`,
    };
  }

  const range =
    typeof minF === "number" && typeof maxF === "number"
      ? `${Math.round(minF)}–${Math.round(maxF)}°F`
      : null;

  return {
    thermal: "none",
    hold: false,
    severity: "ok",
    headline: "Good conditions for live shipping",
    detail: range
      ? `${range} ${where} — comfortably inside the safe range for livestock.`
      : `Conditions ${where} are inside the safe range for livestock.`,
  };
}

/** "Portland, OR" / "Portland" / null */
export function formatPlaceLabel(loc: Pick<VisitorLocation, "city" | "region">): string | null {
  if (!loc.city) return null;
  return loc.region ? `${loc.city}, ${loc.region}` : loc.city;
}

/**
 * Next day livestock may leave the shop. Mirrors the backend rule: ship
 * Monday–Thursday, so Friday/Saturday/Sunday orders wait for Monday. Orders are
 * still accepted on those days.
 */
export function nextShipDayLabel(now: Date): { label: string; shipsToday: boolean } {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const allowed = new Set([1, 2, 3, 4]); // Mon-Thu

  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + offset);
    if (allowed.has(d.getDay())) {
      return {
        label: offset === 0 ? "today" : offset === 1 ? "tomorrow" : names[d.getDay()],
        shipsToday: offset === 0,
      };
    }
  }
  return { label: "Monday", shipsToday: false };
}
