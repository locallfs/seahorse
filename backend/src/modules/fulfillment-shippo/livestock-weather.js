"use strict";
/**
 * Live weather lookup for `thermal_control: "auto"`.
 *
 * Two keyless public APIs, so there is no secret to protect and no bill:
 *   api.zippopotam.us   postal code      -> latitude/longitude
 *   api.open-meteo.com  latitude/longitude -> daily min/max temperature (F)
 *
 * Both ends of the journey are checked and the harsher reading wins — a box
 * leaving a freezing Portland morning needs a heat pack even if the
 * destination is mild.
 *
 * Hard rule: a weather lookup must never break a checkout. Every failure
 * (disabled, timeout, unknown postal code, bad payload, non-US address) falls
 * back to the configured mode and records why. The caller gets a mode either
 * way.
 *
 * Pure decision logic lives in `decideThermalMode` / `decideWeatherHold` so it
 * is unit tested without any network.
 */

const {
  LIVESTOCK_WEATHER_CONFIG,
  AUTO_THERMAL_FALLBACK_MODE,
} = require("./livestock-config");

/** Decide heat/cold/none from the harshest temperatures on the route. */
function decideThermalMode(minF, maxF, cfg = LIVESTOCK_WEATHER_CONFIG) {
  if (typeof minF === "number" && minF <= cfg.coldThresholdF) {
    return { mode: "heat", reason: `low ${minF}F at or below ${cfg.coldThresholdF}F` };
  }
  if (typeof maxF === "number" && maxF >= cfg.hotThresholdF) {
    return { mode: "cold", reason: `high ${maxF}F at or above ${cfg.hotThresholdF}F` };
  }
  return {
    mode: "none",
    reason: `low ${minF}F / high ${maxF}F within safe range`,
  };
}

/**
 * Should this shipment wait for a better day? A thermal pack stops coping at
 * some point. This only RECOMMENDS — the order stays valid and the customer's
 * totals are untouched.
 */
function decideWeatherHold(minF, maxF, cfg = LIVESTOCK_WEATHER_CONFIG) {
  if (typeof minF === "number" && minF <= cfg.hardFreezeF) {
    return { hold: true, reason: `low ${minF}F at or below hard freeze ${cfg.hardFreezeF}F` };
  }
  if (typeof maxF === "number" && maxF >= cfg.extremeHeatF) {
    return { hold: true, reason: `high ${maxF}F at or above extreme heat ${cfg.extremeHeatF}F` };
  }
  return { hold: false, reason: "within shippable temperature range" };
}

/** Harshest pair across every forecast point on the route. */
function combineForecasts(forecasts) {
  const mins = forecasts.map((f) => f?.minF).filter((n) => typeof n === "number");
  const maxs = forecasts.map((f) => f?.maxF).filter((n) => typeof n === "number");
  if (!mins.length || !maxs.length) return null;
  return { minF: Math.min(...mins), maxF: Math.max(...maxs) };
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live weather service. Construct once in the provider and reuse.
 *
 * @param {{ logger?: any, cache?: any, config?: any }} deps
 *   `cache` is any object with async get(key)/set(key, value, ttlSeconds) —
 *   Medusa's cache module satisfies this. Omit it and lookups just repeat.
 */
function createWeatherService(deps = {}) {
  const cfg = deps.config || LIVESTOCK_WEATHER_CONFIG;
  const logger = deps.logger || { info() {}, warn() {}, error() {} };
  const cache = deps.cache || null;

  async function cached(key, ttl, producer) {
    if (cache) {
      try {
        const hit = await cache.get(key);
        if (hit !== null && hit !== undefined) return hit;
      } catch {
        /* cache misses must never be fatal */
      }
    }
    const value = await producer();
    if (cache && value !== null && value !== undefined) {
      try {
        await cache.set(key, value, ttl);
      } catch {
        /* ignore */
      }
    }
    return value;
  }

  /** Postal code -> { lat, lon }. US only; anything else returns null. */
  async function geocodePostalCode(postalCode, countryCode) {
    const zip = String(postalCode || "").trim().slice(0, 5);
    const country = String(countryCode || "US").trim().toUpperCase();
    if (!/^\d{5}$/.test(zip) || country !== "US") return null;

    return cached(`livestock:geo:${country}:${zip}`, cfg.cacheTtlSeconds * 24, async () => {
      const data = await fetchJson(`${cfg.geocodeBaseUrl}/us/${zip}`, cfg.timeoutMs);
      const place = data?.places?.[0];
      const lat = Number(place?.latitude);
      const lon = Number(place?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    });
  }

  /** Daily min/max in F for `date` (YYYY-MM-DD) at a coordinate. */
  async function forecastFor(lat, lon, date) {
    const key = `livestock:wx:${lat.toFixed(2)}:${lon.toFixed(2)}:${date}`;
    return cached(key, cfg.cacheTtlSeconds, async () => {
      const url =
        `${cfg.forecastBaseUrl}?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_min,temperature_2m_max` +
        `&temperature_unit=fahrenheit&timezone=auto` +
        `&start_date=${date}&end_date=${date}`;
      const data = await fetchJson(url, cfg.timeoutMs);
      const minF = Number(data?.daily?.temperature_2m_min?.[0]);
      const maxF = Number(data?.daily?.temperature_2m_max?.[0]);
      if (!Number.isFinite(minF) || !Number.isFinite(maxF)) return null;
      return { minF, maxF };
    });
  }

  /**
   * Resolve `auto` for a shipment.
   *
   * @param {{ origin: {postal_code?:string, country_code?:string},
   *           destination: {postal_code?:string, country_code?:string},
   *           shipDate: string }} ctx
   * @returns {Promise<{mode:"none"|"heat"|"cold", reason:string, source:string,
   *                    weatherHold:boolean, weatherHoldReason:string,
   *                    minF:number|null, maxF:number|null}>}
   */
  async function resolveAutoThermal(ctx) {
    const fallback = (reason) => ({
      mode: AUTO_THERMAL_FALLBACK_MODE,
      reason,
      source: "fallback",
      weatherHold: false,
      weatherHoldReason: "no forecast available",
      minF: null,
      maxF: null,
    });

    if (!cfg.enabled) return fallback("weather lookup disabled");

    try {
      const [originGeo, destGeo] = await Promise.all([
        cfg.includeOrigin
          ? geocodePostalCode(ctx?.origin?.postal_code, ctx?.origin?.country_code)
          : Promise.resolve(null),
        geocodePostalCode(ctx?.destination?.postal_code, ctx?.destination?.country_code),
      ]);

      // The destination is the one that matters; without it, don't guess.
      if (!destGeo) {
        return fallback(
          `could not geocode destination postal code ${ctx?.destination?.postal_code ?? "(none)"}`,
        );
      }

      // Destination always counts; origin only when configured to.
      const points = [destGeo, ...(cfg.includeOrigin && originGeo ? [originGeo] : [])];
      const forecasts = await Promise.all(
        points.map((p) =>
          forecastFor(p.lat, p.lon, ctx.shipDate).catch(() => null),
        ),
      );

      const combined = combineForecasts(forecasts);
      if (!combined) return fallback("forecast unavailable for the ship date");

      const thermal = decideThermalMode(combined.minF, combined.maxF, cfg);
      const hold = decideWeatherHold(combined.minF, combined.maxF, cfg);

      logger.info(
        `[livestock/weather] ${ctx.shipDate} dest=${ctx?.destination?.postal_code} ` +
          `low=${combined.minF}F high=${combined.maxF}F -> ${thermal.mode}` +
          `${hold.hold ? " (weather hold recommended)" : ""}`,
      );

      return {
        mode: thermal.mode,
        reason: thermal.reason,
        source: "open-meteo",
        weatherHold: hold.hold,
        weatherHoldReason: hold.reason,
        minF: combined.minF,
        maxF: combined.maxF,
      };
    } catch (err) {
      logger.warn(
        `[livestock/weather] lookup failed (${err?.message || err}) — using fallback "${AUTO_THERMAL_FALLBACK_MODE}"`,
      );
      return fallback(`lookup failed: ${err?.message || "unknown error"}`);
    }
  }

  return { resolveAutoThermal, geocodePostalCode, forecastFor };
}

module.exports = {
  createWeatherService,
  decideThermalMode,
  decideWeatherHold,
  combineForecasts,
};
