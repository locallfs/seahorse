/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin API for the Size Variants editor. GET returns the product's current
// size state; POST validates through the pure planning core
// (src/lib/size-variants.ts) and executes the plan with core workflows so the
// usual events fire — including product-variant.created, which is what lets
// the QuickBooks auto-create subscriber build one QBO item per new size.

import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  createProductOptionsWorkflow,
  createProductVariantsWorkflow,
  updateProductOptionsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/core-flows"
import {
  CORAL_SIZES,
  FISH_SIZES,
  SIZE_OPTION_TITLE,
  SUPPLY_STANDARD_SIZES,
  isSizeSystem,
  orderSizeValues,
} from "../../../../lib/sizes"
import {
  ExistingVariantState,
  RequestedSize,
  planSizeVariants,
} from "../../../../lib/size-variants"

// One shared sale price list; per-size sale prices live as its usd prices.
const SALE_PRICE_LIST_TITLE = "Storefront Sales"

type LoadedVariant = {
  id: string
  title: string | null
  sku: string | null
  upc: string | null
  barcode: string | null
  metadata: Record<string, any> | null
  size_value: string | null
}

async function loadProductState(scope: any, productId: string) {
  const productModule: any = scope.resolve(Modules.PRODUCT)
  const product = await productModule.retrieveProduct(productId, {
    relations: ["options", "options.values", "variants", "variants.options"],
  })
  const sizeOption =
    (product.options ?? []).find(
      (o: any) =>
        String(o.title ?? "").trim().toLowerCase() ===
        SIZE_OPTION_TITLE.toLowerCase()
    ) ?? null
  const variants: LoadedVariant[] = (product.variants ?? []).map((v: any) => ({
    id: v.id,
    title: v.title ?? null,
    sku: v.sku ?? null,
    upc: v.upc ?? null,
    barcode: v.barcode ?? null,
    metadata: v.metadata ?? null,
    size_value: sizeOption
      ? (v.options ?? []).find((ov: any) => ov.option_id === sizeOption.id)
          ?.value ?? null
      : null,
  }))
  return { product, sizeOption, variants }
}

async function loadPriceAndStock(pg: any, variantIds: string[]) {
  const prices = new Map<
    string,
    { base: number | null; sale: number | null; sale_price_id: string | null }
  >()
  const stock = new Map<string, number>()
  if (variantIds.length === 0) return { prices, stock }
  const marks = variantIds.map(() => "?").join(",")

  const priceRes = await pg.raw(
    `select pvps.variant_id,
            max(case when pr.price_list_id is null then pr.amount end) as base_amount,
            max(case when pl.title = ? then pr.amount end) as sale_amount,
            max(case when pl.title = ? then pr.id end) as sale_price_id
       from product_variant_price_set pvps
       join price pr on pr.price_set_id = pvps.price_set_id
        and pr.deleted_at is null and pr.currency_code = 'usd'
       left join price_list pl on pl.id = pr.price_list_id and pl.deleted_at is null
      where pvps.deleted_at is null and pvps.variant_id in (${marks})
      group by pvps.variant_id`,
    [SALE_PRICE_LIST_TITLE, SALE_PRICE_LIST_TITLE, ...variantIds]
  )
  for (const r of priceRes?.rows || []) {
    prices.set(String(r.variant_id), {
      base: r.base_amount == null ? null : Number(r.base_amount),
      sale: r.sale_amount == null ? null : Number(r.sale_amount),
      sale_price_id: r.sale_price_id == null ? null : String(r.sale_price_id),
    })
  }

  const stockRes = await pg.raw(
    `select l.variant_id, coalesce(sum(il.stocked_quantity), 0) as on_hand
       from product_variant_inventory_item l
       join inventory_level il on il.inventory_item_id = l.inventory_item_id
        and il.deleted_at is null
      where l.deleted_at is null and l.variant_id in (${marks})
      group by l.variant_id`,
    [...variantIds]
  )
  for (const r of stockRes?.rows || []) {
    stock.set(String(r.variant_id), Number(r.on_hand ?? 0))
  }
  return { prices, stock }
}

export async function GET(req: any, res: any) {
  const productId = req.params?.productId
  console.log(`[size-variants] GET start product=${productId}`)
  try {
    const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { product, variants } = await loadProductState(req.scope, productId)
    const { prices, stock } = await loadPriceAndStock(
      pg,
      variants.map((v) => v.id)
    )
    const sizeSystem = isSizeSystem(product.metadata?.size_system)
      ? product.metadata.size_system
      : null
    res.json({
      product_id: productId,
      size_system: sizeSystem,
      size_order: Array.isArray(product.metadata?.size_order)
        ? product.metadata.size_order
        : null,
      option_title: SIZE_OPTION_TITLE,
      available: {
        fish: FISH_SIZES,
        coral: CORAL_SIZES,
        supply_standard: SUPPLY_STANDARD_SIZES,
      },
      sizes: variants.map((v) => ({
        variant_id: v.id,
        value: v.size_value ?? v.title,
        title: v.title,
        sku: v.sku,
        upc: v.upc,
        barcode: v.barcode,
        price: prices.get(v.id)?.base ?? null,
        sale_price: prices.get(v.id)?.sale ?? null,
        quantity: stock.get(v.id) ?? null,
        disabled: v.metadata?.size_disabled === true,
      })),
    })
    console.log(`[size-variants] GET end product=${productId}`)
  } catch (err: any) {
    console.error(`[size-variants] GET error: ${err?.message || err}`)
    res.status(500).json({ error: err?.message || "Failed to load sizes" })
  }
}

export async function POST(req: any, res: any) {
  const productId = req.params?.productId
  console.log(`[size-variants] POST start product=${productId}`)
  try {
    const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body ?? {}
    if (!isSizeSystem(body.size_system)) {
      return res
        .status(400)
        .json({ errors: ["size_system must be fish, coral, or supply"] })
    }
    const requested: RequestedSize[] = Array.isArray(body.sizes)
      ? body.sizes.map((s: any) => ({
          value: String(s?.value ?? ""),
          price: Number(s?.price),
          sale_price:
            s?.sale_price == null || s.sale_price === ""
              ? null
              : Number(s.sale_price),
          sku: s?.sku == null ? null : String(s.sku),
          upc_barcode: s?.upc_barcode == null ? null : String(s.upc_barcode),
          quantity:
            s?.quantity == null || s.quantity === "" ? null : Number(s.quantity),
          disabled: s?.disabled === true,
        }))
      : []

    const { product, sizeOption, variants } = await loadProductState(
      req.scope,
      productId
    )

    // Catalog-wide identifier sets: minting avoids ALL of them; codes owned by
    // other products are hard conflicts the planner rejects visibly.
    const codeRes = await pg.raw(
      `select pv.product_id,
              nullif(trim(coalesce(pv.sku,'')),'') as sku,
              nullif(trim(coalesce(pv.upc,'')),'') as upc,
              nullif(trim(coalesce(pv.barcode,'')),'') as barcode
         from product_variant pv
        where pv.deleted_at is null`
    )
    const takenSkus = new Set<string>()
    const foreignCodes = new Set<string>()
    for (const r of codeRes?.rows || []) {
      if (r.sku) takenSkus.add(String(r.sku))
      if (String(r.product_id) !== String(productId)) {
        for (const c of [r.sku, r.upc, r.barcode]) {
          if (c) foreignCodes.add(String(c))
        }
      }
    }

    const existing: ExistingVariantState[] = variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      size_value: v.size_value,
    }))

    const plan = planSizeVariants({
      size_system: body.size_system,
      sizes: requested,
      existing,
      product_title: product.title ?? "Item",
      product_handle: product.handle ?? null,
      taken_skus: takenSkus,
      foreign_codes: foreignCodes,
    })
    if (plan.ok === false) {
      console.log(`[size-variants] POST rejected: ${plan.errors.join(" | ")}`)
      return res.status(400).json({ errors: plan.errors })
    }

    // 1. Ensure the Size option carries every needed value.
    if (sizeOption) {
      await updateProductOptionsWorkflow(req.scope).run({
        input: {
          selector: { id: sizeOption.id },
          update: { values: plan.option_values },
        },
      })
    } else {
      await createProductOptionsWorkflow(req.scope).run({
        input: {
          product_options: [
            {
              product_id: productId,
              title: SIZE_OPTION_TITLE,
              values: plan.option_values,
            },
          ],
        },
      })
    }

    // 2. Convert the placeholder / update existing size variants in place —
    //    same variant ids, so inventory and QuickBooks mappings are untouched.
    const metaFor = (variantId: string, disabled: boolean) => {
      const current = variants.find((v) => v.id === variantId)?.metadata ?? {}
      return { ...current, size_disabled: disabled }
    }
    const inPlace = [...(plan.convert ? [plan.convert] : []), ...plan.update]
    if (inPlace.length > 0) {
      await updateProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: inPlace.map((p) => ({
            id: p.variant_id,
            title: p.title,
            sku: p.sku || undefined,
            ...(p.barcode ? { barcode: p.barcode, upc: p.barcode } : {}),
            options: { [SIZE_OPTION_TITLE]: p.value },
            metadata: metaFor(p.variant_id, p.disabled),
            prices: [{ currency_code: "usd", amount: p.price }],
          })),
        },
      })
    }

    // 3. Create the genuinely new sizes (fires product-variant.created → the
    //    QuickBooks subscriber creates or safely links ONLY these items).
    let createdVariants: any[] = []
    if (plan.create.length > 0) {
      const { result } = await createProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: plan.create.map((p) => ({
            product_id: productId,
            title: p.title,
            sku: p.sku,
            ...(p.barcode ? { barcode: p.barcode, upc: p.barcode } : {}),
            options: { [SIZE_OPTION_TITLE]: p.value },
            metadata: { size_disabled: p.disabled },
            prices: [{ currency_code: "usd", amount: p.price }],
          })),
        },
      })
      createdVariants = result ?? []
    }

    // 4. Stamp the size system (and supply ordering) on the product.
    const metaPatch: Record<string, any> = { size_system: body.size_system }
    if (plan.size_order) metaPatch.size_order = plan.size_order
    await pg.raw(
      `update product
          set metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb
        where id = ? and deleted_at is null`,
      [JSON.stringify(metaPatch), productId]
    )

    // 5. Per-size sale prices through the one shared sale price list.
    const plannedByVariant = new Map<string, number | null>()
    for (const p of inPlace) plannedByVariant.set(p.variant_id, p.sale_price)
    for (const p of plan.create) {
      const created = createdVariants.find((v: any) => v.title === p.title)
      if (created?.id) plannedByVariant.set(created.id, p.sale_price)
    }
    await syncSalePrices(req.scope, pg, plannedByVariant)

    const variantIdByValue: Record<string, string> = {}
    for (const p of inPlace) variantIdByValue[p.value] = p.variant_id
    for (const p of plan.create) {
      const created = createdVariants.find((v: any) => v.title === p.title)
      if (created?.id) variantIdByValue[p.value] = created.id
    }

    console.log(
      `[size-variants] POST end product=${productId} converted=${plan.convert ? 1 : 0} created=${plan.create.length} updated=${plan.update.length}`
    )
    res.json({
      ok: true,
      product_id: productId,
      size_system: body.size_system,
      variants: variantIdByValue,
      option_values: plan.option_values,
    })
  } catch (err: any) {
    console.error(`[size-variants] POST error: ${err?.message || err}\n${err?.stack || ""}`)
    res.status(500).json({ errors: [err?.message || "Failed to save sizes"] })
  }
}

// Upserts/removes usd sale prices on the shared list so each size's sale price
// is independent. The list is created lazily the first time a sale is set.
async function syncSalePrices(
  scope: any,
  pg: any,
  planned: Map<string, number | null>
) {
  if (planned.size === 0) return
  const wantsAnySale = [...planned.values()].some((v) => v != null)

  const listRes = await pg.raw(
    `select id from price_list where title = ? and deleted_at is null limit 1`,
    [SALE_PRICE_LIST_TITLE]
  )
  let listId: string | null = listRes?.rows?.[0]?.id ?? null
  if (!listId) {
    if (!wantsAnySale) return
    const { result } = await createPriceListsWorkflow(scope).run({
      input: {
        price_lists_data: [
          {
            title: SALE_PRICE_LIST_TITLE,
            description: "Per-size sale prices set from the Size Variants editor",
            type: "sale",
            status: "active",
          },
        ],
      },
    })
    listId = result?.[0]?.id ?? null
    if (!listId) throw new Error("could not create the sale price list")
  }

  const variantIds = [...planned.keys()]
  const marks = variantIds.map(() => "?").join(",")
  const existingRes = await pg.raw(
    `select pr.id, pvps.variant_id, pr.amount
       from price pr
       join product_variant_price_set pvps on pvps.price_set_id = pr.price_set_id
        and pvps.deleted_at is null
      where pr.price_list_id = ? and pr.deleted_at is null
        and pr.currency_code = 'usd' and pvps.variant_id in (${marks})`,
    [listId, ...variantIds]
  )
  const existingByVariant = new Map<string, { id: string; amount: number }>()
  for (const r of existingRes?.rows || []) {
    existingByVariant.set(String(r.variant_id), {
      id: String(r.id),
      amount: Number(r.amount),
    })
  }

  const create: any[] = []
  const update: any[] = []
  const remove: string[] = []
  for (const [variantId, sale] of planned) {
    const row = existingByVariant.get(variantId)
    if (sale == null) {
      if (row) remove.push(row.id)
    } else if (!row) {
      create.push({ variant_id: variantId, currency_code: "usd", amount: sale })
    } else if (row.amount !== sale) {
      update.push({
        id: row.id,
        variant_id: variantId,
        currency_code: "usd",
        amount: sale,
      })
    }
  }
  if (create.length || update.length || remove.length) {
    await batchPriceListPricesWorkflow(scope).run({
      input: { data: { id: listId, create, update, delete: remove } },
    })
  }
}
