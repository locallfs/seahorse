import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

async function resolveInventoryFor(
  scope: any,
  variantId: string,
): Promise<{
  inventory_item_id: string | null
  location_id: string | null
  stocked_quantity: number | null
}> {
  const remoteLink: any = scope.resolve(ContainerRegistrationKeys.LINK)
  const linkService = remoteLink.getLinkModule(
    Modules.PRODUCT,
    "variant_id",
    Modules.INVENTORY,
    "inventory_item_id",
  )
  const links = await linkService.list(
    { variant_id: [variantId] },
    { select: ["variant_id", "inventory_item_id"] },
  )
  const first = links?.[0]
  const inventoryItemId = first?.inventory_item_id
  if (!inventoryItemId) {
    return { inventory_item_id: null, location_id: null, stocked_quantity: null }
  }

  const inventoryModule: any = scope.resolve(Modules.INVENTORY)
  const levels = await inventoryModule.listInventoryLevels({
    inventory_item_id: inventoryItemId,
  })
  const level = levels?.[0]

  return {
    inventory_item_id: inventoryItemId,
    location_id: level?.location_id ?? null,
    stocked_quantity:
      typeof level?.stocked_quantity === "number"
        ? level.stocked_quantity
        : null,
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