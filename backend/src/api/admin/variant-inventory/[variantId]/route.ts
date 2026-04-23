import { ContainerRegistrationKeys } from "@medusajs/utils"

export async function GET(req: any, res: any) {
  const variantId = req.params?.variantId
  console.log(`[admin/variant-inventory] GET variantId=${variantId}`)
  if (!variantId) {
    return res.status(400).json({ error: "variantId is required" })
  }
  try {
    const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "sku",
        "inventory_items.inventory.id",
        "inventory_items.inventory.sku",
        "inventory_items.inventory.location_levels.id",
        "inventory_items.inventory.location_levels.location_id",
        "inventory_items.inventory.location_levels.stocked_quantity",
      ],
      filters: { id: variantId },
    })

    const variant = data?.[0]
    const links = (variant?.inventory_items ?? []) as any[]
    const first = links[0]?.inventory
    const level = first?.location_levels?.[0]

    if (!first) {
      return res.json({
        variant_id: variantId,
        inventory_item_id: null,
        location_id: null,
        stocked_quantity: null,
      })
    }

    res.json({
      variant_id: variantId,
      inventory_item_id: first.id,
      location_id: level?.location_id ?? null,
      stocked_quantity: level?.stocked_quantity ?? null,
    })
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
    return res.status(400).json({ error: "stocked_quantity must be a non-negative number" })
  }
  try {
    const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "inventory_items.inventory.id",
        "inventory_items.inventory.location_levels.id",
        "inventory_items.inventory.location_levels.location_id",
      ],
      filters: { id: variantId },
    })

    const first = data?.[0]?.inventory_items?.[0]?.inventory
    const level = first?.location_levels?.[0]
    if (!first?.id || !level?.location_id) {
      return res.status(404).json({
        error: "No inventory level is set up for this variant yet. Open the variant, enable Manage Inventory, and set a stock location first.",
      })
    }

    const inventoryModule: any = req.scope.resolve("inventory")
    await inventoryModule.updateInventoryLevels([
      {
        inventory_item_id: first.id,
        location_id: level.location_id,
        stocked_quantity,
      },
    ])

    res.json({
      variant_id: variantId,
      inventory_item_id: first.id,
      location_id: level.location_id,
      stocked_quantity,
    })
  } catch (err: any) {
    console.error(`[admin/variant-inventory] update error: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to update inventory" })
  }
}
