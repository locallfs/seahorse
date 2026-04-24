import { ContainerRegistrationKeys } from "@medusajs/utils"

async function resolveInventoryFor(
  scope: any,
  variantId: string,
): Promise<{
  inventory_item_id: string | null
  location_id: string | null
  stocked_quantity: number | null
}> {
  const query: any = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: links } = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id"],
    filters: { variant_id: variantId },
  })
  const link = links?.[0]
  if (!link?.inventory_item_id) {
    return { inventory_item_id: null, location_id: null, stocked_quantity: null }
  }

  const { data: items } = await query.graph({
    entity: "inventory_item",
    fields: [
      "id",
      "sku",
      "stocked_quantity",
      "location_levels.id",
      "location_levels.location_id",
      "location_levels.stocked_quantity",
    ],
    filters: { id: link.inventory_item_id },
  })
  const item = items?.[0]
  const level = item?.location_levels?.[0]
  return {
    inventory_item_id: item?.id ?? link.inventory_item_id,
    location_id: level?.location_id ?? null,
    stocked_quantity:
      level?.stocked_quantity ?? item?.stocked_quantity ?? null,
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
      })
    }
    const inventoryModule: any = req.scope.resolve("inventory")
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