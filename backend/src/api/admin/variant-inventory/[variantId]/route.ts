import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/utils"

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
  try {
    const info = await resolveInventoryFor(req.scope, variantId)
    if (!info.inventory_item_id || !info.location_id) {
      return res.status(404).json({
        error:
          "No inventory level is set up for this variant yet. Open the variant, enable Manage Inventory, and set a stock location first.",
        debug: info.debug,
      })
    }
    const inventoryModule: any = req.scope.resolve(Modules.INVENTORY)
    await inventoryModule.updateInventoryLevels([
      {
        inventory_item_id: info.inventory_item_id,
        location_id: info.location_id,
        stocked_quantity,
      },
    ])
    res.json({
      variant_id: variantId,
      inventory_item_id: info.inventory_item_id,
      location_id: info.location_id,
      stocked_quantity,
    })
  } catch (err: any) {
    console.error(`[admin/variant-inventory] update error: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to update inventory" })
  }
}
