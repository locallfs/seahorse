import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/utils"
import { buildVariantSku } from "../../../../lib/sku"

type ResolveResult = {
  inventory_item_id: string | null
  location_id: string | null
  stocked_quantity: number | null
  debug: Record<string, unknown>
}

async function resolveInventoryFor(
  scope: any,
  variantId: string,
): Promise<ResolveResult> {
  const debug: Record<string, unknown> = {}

  const remoteQuery: any = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  debug.has_remoteQuery = !!remoteQuery

  const queryObj = remoteQueryObjectFromString({
    entryPoint: "product_variant",
    variables: { filters: { id: variantId } },
    fields: [
      "id",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.id",
      "inventory_items.inventory.location_levels.id",
      "inventory_items.inventory.location_levels.location_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
  })

  let variants: any[] = []
  try {
    variants = await remoteQuery(queryObj)
    debug.variants_count = Array.isArray(variants) ? variants.length : "not-array"
    debug.variant_sample = variants?.[0]
      ? JSON.parse(JSON.stringify(variants[0]))
      : null
  } catch (err: any) {
    debug.remoteQuery_error = err?.message || String(err)
  }

  const variant = variants?.[0]
  const invLink = variant?.inventory_items?.[0]
  const inventory = invLink?.inventory
  const level = inventory?.location_levels?.[0]

  return {
    inventory_item_id: inventory?.id ?? invLink?.inventory_item_id ?? null,
    location_id: level?.location_id ?? null,
    stocked_quantity:
      typeof level?.stocked_quantity === "number"
        ? level.stocked_quantity
        : null,
    debug,
  }
}

export async function GET(req: any, res: any) {
  const variantId = req.params?.variantId
  console.log(`[admin/variant-inventory] GET variantId=${variantId}`)
  if (!variantId) {
    return res.status(400).json({ error: "variantId is required" })
  }
  try {
    const info = await resolveInventoryFor(req.scope, variantId)
    console.log(`[admin/variant-inventory] debug: ${JSON.stringify(info.debug)}`)
    res.setHeader("Cache-Control", "no-store")
    res.json({ variant_id: variantId, ...info })
  } catch (err: any) {
    console.error(`[admin/variant-inventory] error: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to load inventory" })
  }
}

export async function POST(req: any, res: any) {
  const variantId = req.params?.variantId
  const { stocked_quantity } = req.body ?? {}
  console.log(`[admin/variant-inventory] POST variantId=${variantId} qty=${stocked_quantity}`)
  if (!variantId) {
    return res.status(400).json({ error: "variantId is required" })
  }
  if (typeof stocked_quantity !== "number" || stocked_quantity < 0) {
    return res
      .status(400)
      .json({ error: "stocked_quantity must be a non-negative number" })
  }
  let step = "init"
  try {
    const inventoryModule: any = req.scope.resolve(Modules.INVENTORY)
    const stockLocationModule: any = req.scope.resolve(Modules.STOCK_LOCATION)
    const productModule: any = req.scope.resolve(Modules.PRODUCT)
    const remoteLink: any = req.scope.resolve(ContainerRegistrationKeys.LINK)

    step = "resolveInventoryFor"
    let info = await resolveInventoryFor(req.scope, variantId)
    let { inventory_item_id, location_id } = info

    if (!inventory_item_id) {
      step = "retrieveProductVariant"
      const variant = await productModule
        .retrieveProductVariant(variantId, {
          select: ["id", "sku", "title", "product_id"],
        })
        .catch((e: any) => {
          console.warn(`[admin/variant-inventory] retrieveProductVariant: ${e?.message || e}`)
          return null
        })
      let sku = variant?.sku ?? null
      const title = variant?.title ?? null

      if (!sku || !sku.trim()) {
        step = "mint-sku"
        const product = variant?.product_id
          ? await productModule
              .retrieveProduct(variant.product_id, { relations: ["variants"] })
              .catch(() => null)
          : null
        const allProducts = await productModule
          .listProducts({}, { relations: ["variants"], take: null })
          .catch(() => [])
        const taken = new Set<string>()
        for (const p of allProducts) {
          for (const v of p.variants ?? []) {
            if (v.sku && v.sku.trim()) taken.add(v.sku.trim())
          }
        }
        const variants = product?.variants ?? []
        const idx = Math.max(0, variants.findIndex((v: any) => v.id === variantId))
        sku = buildVariantSku(
          product?.title ?? "Item",
          product?.handle ?? null,
          idx,
          variants.length || 1,
          taken,
        )
        step = "updateProductVariants(sku)"
        await productModule.updateProductVariants(variantId, { sku }).catch((err: any) => {
          console.warn(
            `[admin/variant-inventory] could not write SKU: ${err?.message || err}`,
          )
        })
      }

      step = "createInventoryItems"
      console.log(
        `[admin/variant-inventory] bootstrapping inventory_item variant=${variantId} sku=${sku}`,
      )
      const itemPayload: any = { sku, requires_shipping: true }
      if (title) itemPayload.title = title
      const created = await inventoryModule.createInventoryItems(itemPayload)
      inventory_item_id = Array.isArray(created) ? created[0]?.id : created?.id
      if (!inventory_item_id) {
        return res
          .status(500)
          .json({ error: "createInventoryItems returned no id" })
      }

      step = "remoteLink.create"
      await remoteLink.create({
        [Modules.PRODUCT]: { variant_id: variantId },
        [Modules.INVENTORY]: { inventory_item_id },
      })
    }

    if (!location_id) {
      step = "listStockLocations"
      const locations = await stockLocationModule.listStockLocations(
        {},
        { take: 1, select: ["id"] },
      )
      const firstLocation = locations?.[0]
      if (!firstLocation?.id) {
        return res.status(500).json({
          error:
            "No stock location exists. Open Medusa admin → Settings → Locations and add one.",
        })
      }
      location_id = firstLocation.id

      step = "createInventoryLevels"
      console.log(
        `[admin/variant-inventory] creating level inventory_item=${inventory_item_id} location=${location_id}`,
      )
      await inventoryModule.createInventoryLevels([
        { inventory_item_id, location_id, stocked_quantity },
      ])
      return res.json({
        variant_id: variantId,
        inventory_item_id,
        location_id,
        stocked_quantity,
        bootstrapped: true,
      })
    }

    step = "updateInventoryLevels"
    await inventoryModule.updateInventoryLevels([
      { inventory_item_id, location_id, stocked_quantity },
    ])

    step = "cleanup-duplicates"
    await cleanupDuplicateInventoryItems(req.scope, variantId, inventory_item_id).catch(
      (err: any) => {
        console.warn(
          `[admin/variant-inventory] cleanup failed (non-fatal): ${err?.message || err}`,
        )
      },
    )

    res.json({
      variant_id: variantId,
      inventory_item_id,
      location_id,
      stocked_quantity,
    })
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error(
      `[admin/variant-inventory] step=${step} error: ${msg}\n${err?.stack || ""}`,
    )
    res.status(500).json({ error: `step=${step}: ${msg}` })
  }
}

/**
 * Removes any inventory_item links for this variant other than `keepId`.
 * Necessary because Medusa's manage_inventory toggle sometimes leaves an
 * empty inventory_item linked, which my bootstrap doesn't see via
 * remoteQuery — so a fresh one gets created alongside it. The result is two
 * "Default" rows in the meatball Edit Stock dialog.
 */
async function cleanupDuplicateInventoryItems(
  scope: any,
  variantId: string,
  keepId: string,
) {
  const remoteQuery: any = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const remoteLink: any = scope.resolve(ContainerRegistrationKeys.LINK)
  const inventoryModule: any = scope.resolve(Modules.INVENTORY)

  const queryObj = remoteQueryObjectFromString({
    entryPoint: "product_variant_inventory_item",
    variables: { filters: { variant_id: variantId } },
    fields: ["variant_id", "inventory_item_id"],
  })
  const links = (await remoteQuery(queryObj)) as Array<{
    variant_id: string
    inventory_item_id: string
  }>

  const stale = links.filter(
    (l) => l.inventory_item_id && l.inventory_item_id !== keepId,
  )
  if (stale.length === 0) return

  console.log(
    `[admin/variant-inventory] cleanup: removing ${stale.length} stale inventory_item(s) for variant=${variantId}`,
  )

  for (const link of stale) {
    await remoteLink
      .dismiss({
        [Modules.PRODUCT]: { variant_id: variantId },
        [Modules.INVENTORY]: { inventory_item_id: link.inventory_item_id },
      })
      .catch((e: any) =>
        console.warn(`  dismiss failed: ${e?.message || e}`),
      )
    await inventoryModule
      .deleteInventoryItems([link.inventory_item_id])
      .catch((e: any) =>
        console.warn(`  delete inventory_item failed: ${e?.message || e}`),
      )
  }
}
