import { describe, expect, it } from "vitest"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ShippoFulfillmentService = require("../service")

/**
 * Regression guard for a real outage.
 *
 * Awilix containers THROW on an unregistered key instead of returning
 * undefined, and the fulfillment module's container does not carry the
 * app-level cache module. An unguarded `container.cacheService` therefore threw
 * inside the constructor, which made Medusa unable to resolve the whole Shippo
 * provider — taking dry-goods shipping down with it.
 */

const silentLogger = { info() {}, warn() {}, error() {} }

/** A container that behaves like Awilix: unknown keys throw. */
function throwingContainer(registered: Record<string, unknown>) {
  return new Proxy(registered, {
    get(target, key) {
      if (key in target) return target[key as string]
      throw new Error(`AwilixResolutionError: Could not resolve '${String(key)}'.`)
    },
  })
}

describe("provider construction", () => {
  it("survives a container that throws on unregistered keys", () => {
    const container = throwingContainer({
      logger: silentLogger,
      __pg_connection__: null,
    })
    expect(
      () => new ShippoFulfillmentService(container, { api_key: "test" })
    ).not.toThrow()
  })

  it("falls back to a working in-process cache when none is registered", async () => {
    const svc = new ShippoFulfillmentService(
      throwingContainer({ logger: silentLogger, __pg_connection__: null }),
      { api_key: "test" }
    )
    expect(typeof svc.cache.get).toBe("function")
    expect(typeof svc.cache.set).toBe("function")

    await svc.cache.set("probe", 42, 60)
    expect(await svc.cache.get("probe")).toBe(42)
    expect(await svc.cache.get("absent")).toBeNull()
  })

  it("expires entries in the fallback cache", async () => {
    const svc = new ShippoFulfillmentService(
      throwingContainer({ logger: silentLogger, __pg_connection__: null }),
      { api_key: "test" }
    )
    await svc.cache.set("short", "value", -1) // already expired
    expect(await svc.cache.get("short")).toBeNull()
  })

  it("uses a registered cache when the container does provide one", async () => {
    const store = new Map<string, unknown>()
    const registered = {
      logger: silentLogger,
      __pg_connection__: null,
      cacheService: {
        async get(k: string) {
          return store.has(k) ? store.get(k) : null
        },
        async set(k: string, v: unknown) {
          store.set(k, v)
        },
      },
    }
    const svc = new ShippoFulfillmentService(throwingContainer(registered), {
      api_key: "test",
    })
    await svc.cache.set("k", "from-medusa")
    expect(store.get("k")).toBe("from-medusa")
  })

  it("still refuses to start without an api key", () => {
    expect(
      () =>
        new ShippoFulfillmentService(
          throwingContainer({ logger: silentLogger, __pg_connection__: null }),
          {}
        )
    ).toThrow()
  })

  it("advertises the livestock option alongside the existing three", async () => {
    const svc = new ShippoFulfillmentService(
      throwingContainer({ logger: silentLogger, __pg_connection__: null }),
      { api_key: "test" }
    )
    const ids = (await svc.getFulfillmentOptions()).map((o: any) => o.id)
    expect(ids).toEqual([
      "shippo-standard",
      "shippo-express",
      "shippo-overnight",
      "shippo-livestock-next-day",
    ])
  })

  it("the livestock option carries the config calculatePrice needs", async () => {
    const svc = new ShippoFulfillmentService(
      throwingContainer({ logger: silentLogger, __pg_connection__: null }),
      { api_key: "test" }
    )
    const live = (await svc.getFulfillmentOptions()).find(
      (o: any) => o.id === "shippo-livestock-next-day"
    )
    // Medusa stores this as shipping_option.data and hands it back as
    // optionData — it is the only route by which this config is readable.
    expect(live).toMatchObject({
      shipping_type: "livestock",
      carrier: "UPS",
      service_level_token: "ups_next_day_air",
      live_arrival_guarantee: true,
      max_transit_days: 1,
    })
  })
})
