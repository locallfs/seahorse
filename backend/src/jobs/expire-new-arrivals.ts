import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000
const TAG_ALIASES = ["new arrival", "new arrivals"]
const CATEGORY_HANDLE = "new-arrivals"

export default async function expireNewArrivals(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule: any = container.resolve(Modules.PRODUCT)

  const [allTags, matchingCategories] = await Promise.all([
    productModule.listProductTags({}, { take: 2000 }),
    productModule.listProductCategories({ handle: CATEGORY_HANDLE }),
  ])

  const newArrivalTag = allTags.find(
    (t: any) =>
      typeof t?.value === "string" &&
      TAG_ALIASES.includes(t.value.toLowerCase()),
  )
  const newArrivalCategory = matchingCategories[0]

  if (!newArrivalTag && !newArrivalCategory) {
    logger.info("expire-new-arrivals: no tag or category found; nothing to do")
    return
  }

  const filters: any = {}
  const orClauses: any[] = []
  if (newArrivalTag) orClauses.push({ tags: { id: newArrivalTag.id } })
  if (newArrivalCategory)
    orClauses.push({ categories: { id: newArrivalCategory.id } })
  if (orClauses.length === 1) Object.assign(filters, orClauses[0])
  else filters.$or = orClauses

  const products: any[] = await productModule.listProducts(filters, {
    take: 1000,
    relations: ["tags", "categories"],
  })

  const now = Date.now()
  let stamped = 0
  let expired = 0

  for (const product of products) {
    const meta: Record<string, any> = { ...(product.metadata || {}) }
    const stampRaw = meta.new_arrivals_tagged_at
    const stampMs = stampRaw ? new Date(stampRaw).getTime() : NaN

    if (!Number.isFinite(stampMs)) {
      await productModule.updateProducts(product.id, {
        metadata: {
          ...meta,
          new_arrivals_tagged_at: new Date().toISOString(),
        },
      })
      stamped++
      continue
    }

    if (now - stampMs < TEN_DAYS_MS) continue

    const remainingTagIds = (product.tags || [])
      .map((t: any) => t.id)
      .filter((id: string) => id !== newArrivalTag?.id)
    const remainingCategoryIds = (product.categories || [])
      .map((c: any) => c.id)
      .filter((id: string) => id !== newArrivalCategory?.id)

    const { new_arrivals_tagged_at: _drop, ...restMeta } = meta
    void _drop

    const updatePayload: any = { metadata: restMeta }
    if (newArrivalTag) updatePayload.tag_ids = remainingTagIds
    if (newArrivalCategory) updatePayload.category_ids = remainingCategoryIds

    await productModule.updateProducts(product.id, updatePayload)
    expired++
    logger.info(
      `expire-new-arrivals: removed new-arrival membership from ${product.id}`,
    )
  }

  logger.info(
    `expire-new-arrivals: scanned ${products.length}, stamped ${stamped}, expired ${expired}`,
  )
}

export const config = {
  name: "expire-new-arrivals",
  schedule: "0 2 * * *",
}
