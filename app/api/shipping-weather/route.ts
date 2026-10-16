import { NextResponse } from "next/server";
import {
  describeShippingWeather,
  formatPlaceLabel,
  nextShipDayLabel,
  readVisitorLocation,
  type VisitorLocation,
} from "@/lib/shippingWeather";

/**
 * Live shipping conditions for whoever is asking.
 *
 * Location resolution, best first:
 *   1. ?postal=XXXXX  — the customer's actual shipping address, once known
 *   2. Vercel request geo headers — where the visitor is, no prompt, no key
 *   3. the shop itself — so the notice still says something sensible locally
 *
 * Everything happens server-side. Both upstream APIs are keyless, so there is
 * no secret to expose either way.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://api.zippopotam.us/us";
const TIMEOUT_MS = 2500;

// The shop, used only as a last-resort fallback.
const STORE_FALLBACK: VisitorLocation = {
  city: "Portland",
  region: "OR",
  postalCode: "97211",
  country: "US",
  latitude: 45.5777433,
  longitude: -122.6648056,
  source: "store-fallback",
};

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Forecasts move slowly; let the platform cache them for an hour.
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function locationFromPostal(postal: string): Promise<VisitorLocation | null> {
  const zip = postal.trim().slice(0, 5);
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const data = await fetchJson(`${GEOCODE_URL}/${zip}`);
    const place = data?.places?.[0];
    const lat = Number(place?.latitude);
    const lon = Number(place?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      city: place?.["place name"] ?? null,
      region: place?.["state abbreviation"] ?? null,
      postalCode: zip,
      country: "US",
      latitude: lat,
      longitude: lon,
      source: "address",
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  console.log("[api/shipping-weather] start");

  try {
    const url = new URL(req.url);
    const postal = url.searchParams.get("postal");

    // 1. explicit postal code wins — it's the real destination
    let location: VisitorLocation | null = postal ? await locationFromPostal(postal) : null;

    // 2. otherwise, where the request came from
    if (!location) {
      const fromRequest = readVisitorLocation(req.headers);
      if (fromRequest?.latitude != null) {
        location = fromRequest;
      } else if (fromRequest?.postalCode) {
        // Headers gave a postal code but no coordinates — geocode it.
        location = (await locationFromPostal(fromRequest.postalCode)) ?? null;
        if (location) location.source = "request";
      }
    }

    // 3. last resort so the notice is never blank
    const resolved = location ?? STORE_FALLBACK;

    if (resolved.latitude == null || resolved.longitude == null) {
      console.log("[api/shipping-weather] no coordinates available");
      return NextResponse.json({ available: false }, { status: 200 });
    }

    const forecast = await fetchJson(
      `${FORECAST_URL}?latitude=${resolved.latitude}&longitude=${resolved.longitude}` +
        `&current=temperature_2m&daily=temperature_2m_min,temperature_2m_max` +
        `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`,
    );

    const currentF = Number(forecast?.current?.temperature_2m);
    const minF = Number(forecast?.daily?.temperature_2m_min?.[0]);
    const maxF = Number(forecast?.daily?.temperature_2m_max?.[0]);

    const placeLabel = formatPlaceLabel(resolved);
    const verdict = describeShippingWeather(
      Number.isFinite(minF) ? minF : null,
      Number.isFinite(maxF) ? maxF : null,
      placeLabel,
    );
    const shipDay = nextShipDayLabel(new Date());

    console.log(
      `[api/shipping-weather] ${placeLabel ?? "unknown"} (${resolved.source}) ` +
        `low=${minF} high=${maxF} -> ${verdict.thermal}${verdict.hold ? " hold" : ""}`,
    );

    return NextResponse.json({
      available: true,
      location: {
        label: placeLabel,
        postalCode: resolved.postalCode,
        source: resolved.source,
      },
      currentF: Number.isFinite(currentF) ? Math.round(currentF) : null,
      minF: Number.isFinite(minF) ? Math.round(minF) : null,
      maxF: Number.isFinite(maxF) ? Math.round(maxF) : null,
      ...verdict,
      nextShipDay: shipDay.label,
      shipsToday: shipDay.shipsToday,
    });
  } catch (err) {
    // A forecast is a nicety — never let it turn into a visible error.
    console.error(
      `[api/shipping-weather] failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    return NextResponse.json({ available: false }, { status: 200 });
  } finally {
    console.log("[api/shipping-weather] end");
  }
}
