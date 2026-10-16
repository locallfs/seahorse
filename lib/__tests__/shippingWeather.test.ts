import { describe, expect, it } from "vitest";
import {
  describeShippingWeather,
  formatPlaceLabel,
  nextShipDayLabel,
  readVisitorLocation,
  SHIPPING_WEATHER_THRESHOLDS,
} from "../shippingWeather";

const headers = (h: Record<string, string>) => new Headers(h);

describe("readVisitorLocation", () => {
  it("reads Vercel geo headers", () => {
    const loc = readVisitorLocation(
      headers({
        "x-vercel-ip-city": "Miami",
        "x-vercel-ip-country-region": "FL",
        "x-vercel-ip-postal-code": "33139",
        "x-vercel-ip-country": "US",
        "x-vercel-ip-latitude": "25.7907",
        "x-vercel-ip-longitude": "-80.1300",
      }),
    );
    expect(loc).toMatchObject({
      city: "Miami",
      region: "FL",
      postalCode: "33139",
      latitude: 25.7907,
      longitude: -80.13,
      source: "request",
    });
  });

  it("url-decodes city names with spaces", () => {
    const loc = readVisitorLocation(
      headers({
        "x-vercel-ip-city": "San%20Francisco",
        "x-vercel-ip-latitude": "37.77",
        "x-vercel-ip-longitude": "-122.42",
      }),
    );
    expect(loc?.city).toBe("San Francisco");
  });

  it("returns a postal-only location when coordinates are missing", () => {
    const loc = readVisitorLocation(headers({ "x-vercel-ip-postal-code": "97211" }));
    expect(loc).toMatchObject({ postalCode: "97211", latitude: null, longitude: null });
  });

  it("returns null with no usable headers at all (local dev)", () => {
    expect(readVisitorLocation(headers({}))).toBeNull();
  });
});

describe("describeShippingWeather", () => {
  const t = SHIPPING_WEATHER_THRESHOLDS;

  it("reassures in the safe range", () => {
    const v = describeShippingWeather(60, 78, "Portland, OR");
    expect(v.severity).toBe("ok");
    expect(v.thermal).toBe("none");
    expect(v.hold).toBe(false);
    expect(v.detail).toContain("Portland, OR");
  });

  it("promises a heat pack when cold, without alarming", () => {
    const v = describeShippingWeather(t.coldThresholdF, 60, "Denver, CO");
    expect(v.thermal).toBe("heat");
    expect(v.hold).toBe(false);
    expect(v.severity).toBe("caution");
    expect(v.headline).toMatch(/heat pack/i);
    expect(v.detail).toMatch(/no extra cost/i);
  });

  it("promises a cold pack when hot", () => {
    const v = describeShippingWeather(70, t.hotThresholdF, "Phoenix, AZ");
    expect(v.thermal).toBe("cold");
    expect(v.hold).toBe(false);
    expect(v.headline).toMatch(/cold pack/i);
  });

  it("warns about a hold on a hard freeze", () => {
    const v = describeShippingWeather(t.hardFreezeF, 40, "Fairbanks, AK");
    expect(v.hold).toBe(true);
    expect(v.severity).toBe("hold");
    expect(v.thermal).toBe("heat");
    expect(v.detail).toMatch(/held/i);
  });

  it("warns about a hold in extreme heat", () => {
    const v = describeShippingWeather(80, t.extremeHeatF, "Death Valley, CA");
    expect(v.hold).toBe(true);
    expect(v.thermal).toBe("cold");
  });

  it("treats a freezing night as more urgent than a hot day", () => {
    const v = describeShippingWeather(20, 101, "Somewhere, NV");
    expect(v.thermal).toBe("heat");
    expect(v.hold).toBe(true);
  });

  it("copes with a missing place label and missing temperatures", () => {
    const v = describeShippingWeather(null, null, null);
    expect(v.severity).toBe("ok");
    expect(v.detail).toContain("your delivery area");
  });

  it("never leaks internals into customer copy", () => {
    for (const v of [
      describeShippingWeather(10, 20, "X"),
      describeShippingWeather(60, 70, "X"),
      describeShippingWeather(90, 110, "X"),
    ]) {
      const text = `${v.headline} ${v.detail}`.toLowerCase();
      expect(text).not.toContain("pack unit");
      expect(text).not.toContain("packed_weight");
      expect(text).not.toContain("api");
      expect(text).not.toContain("shippo");
    }
  });
});

describe("formatPlaceLabel", () => {
  it("joins city and region", () => {
    expect(formatPlaceLabel({ city: "Portland", region: "OR" })).toBe("Portland, OR");
  });
  it("falls back to city alone", () => {
    expect(formatPlaceLabel({ city: "Portland", region: null })).toBe("Portland");
  });
  it("returns null without a city", () => {
    expect(formatPlaceLabel({ city: null, region: "OR" })).toBeNull();
  });
});

describe("nextShipDayLabel", () => {
  it("ships today Monday through Thursday", () => {
    // 2026-10-05 is a Monday, 2026-10-08 a Thursday.
    expect(nextShipDayLabel(new Date("2026-10-05T12:00:00Z")).shipsToday).toBe(true);
    expect(nextShipDayLabel(new Date("2026-10-08T12:00:00Z")).shipsToday).toBe(true);
  });

  it("never claims a Friday or weekend order ships today", () => {
    for (const d of ["2026-10-09", "2026-10-10", "2026-10-11"]) {
      expect(nextShipDayLabel(new Date(`${d}T12:00:00Z`)).shipsToday).toBe(false);
    }
  });

  it("names the day on Friday and Saturday, and says tomorrow on Sunday", () => {
    expect(nextShipDayLabel(new Date("2026-10-09T12:00:00Z")).label).toBe("Monday");
    expect(nextShipDayLabel(new Date("2026-10-10T12:00:00Z")).label).toBe("Monday");
    // Sunday: Monday really is tomorrow, so say so.
    expect(nextShipDayLabel(new Date("2026-10-11T12:00:00Z")).label).toBe("tomorrow");
  });

  it("agrees with the backend rule: Monday to Thursday only", () => {
    const shipping: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date("2026-10-05T12:00:00Z");
      d.setDate(d.getDate() + i);
      if (nextShipDayLabel(d).shipsToday) {
        shipping.push(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]);
      }
    }
    expect(shipping).toEqual(["Mon", "Tue", "Wed", "Thu"]);
  });
});
