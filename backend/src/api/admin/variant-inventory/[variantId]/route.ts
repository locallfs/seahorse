import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

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
  const remoteLink: any = scope.resolve(ContainerRegistrationKeys.LINK)
  debug.has_remoteLink = !!remoteLink
  debug.has_getLinkModule = typeof remoteLink?.getLinkModule === "function"

  let linkService: any = null
  try {
    linkService = remoteLink.getLinkModule(
      Modules.PRODUCT,
      "variant_id",
      Modules.INVENTORY,
      "inventory_item_id",
    )
  } catch (err: any) {
    debug.getLinkModule_error = err?.message || String(err)
  }
  debug.has_linkService = !!linkService

  let links: any[] = []
  if (linkService) {
    try {
      links = await linkService.list(
        { variant_id: [variantId] },
        { select: ["variant_id", "inventory_item_id"] },
      )
      debug.links_count = Array.isArray(links) ? links.length : "not-array"
      debug.links_sample = Array.isArray(links) ? links[0] : null
    } catch (err: any) {
      debug.linkService_list_error = err?.message || String(err)
    }
  }

  const first = links?.[0]
  const inventoryItemId = first?.inventory_item_id
  if (!inventoryItemId) {
    return {
      inventory_item_id: null,
      location_id: null,
      stocked_quantity: null,
      debug,
    }
  }

  const inventoryModule: any = scope.resolve(Modules.INVENTORY)
  debug.has_inventoryModule = !!inventoryModule

  let levels: any[] = []
  try {
    levels = await inventoryModule.listInventoryLevels({
      inventory_item_id: inventoryItemId,
    })
    debug.levels_count = Array.isArray(levels) ? levels.length : "not-array"
    debug.levels_sample = Array.isArray(levels) ? levels[0] : null
  } catch (err: any) {
    debug.listInventoryLevels_error = err?.message || String(err)
  }

  const level = levels?.[0]
  return {
    inventory_item_id: inventoryItemId,
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
