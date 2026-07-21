import type QuickbooksModuleService from "./service"
import { qboQuery, qboRequest } from "./qbo-client"

interface QboAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType?: string
}

export interface QboItem {
  Id: string
  Name: string
  Sku?: string
  Type: "Service" | "Inventory" | "NonInventory"
  SyncToken: string
  QtyOnHand?: number
  UnitPrice?: number
  Active?: boolean
  IncomeAccountRef?: { value: string; name?: string }
}

export interface QboAccountRefs {
  incomeAccountId: string
}

export async function findDefaultIncomeAccount(
  service: QuickbooksModuleService
): Promise<QboAccountRefs> {
  const res = await qboQuery<{ QueryResponse: { Account?: QboAccount[] } }>(
    service,
    "select Id, Name, AccountType, AccountSubType from Account where AccountType = 'Income' maxresults 100"
  )
  const accounts = res.QueryResponse?.Account || []
  if (accounts.length === 0) {
    throw new Error("No Income accounts found in QuickBooks. Create one first.")
  }
  const productIncome = accounts.find(
    (a) => a.AccountSubType === "SalesOfProductIncome"
  )
  const chosen = productIncome || accounts[0]
  return { incomeAccountId: chosen.Id }
}

export async function findItemBySku(
  service: QuickbooksModuleService,
  sku: string
): Promise<QboItem | null> {
  const escaped = sku.replace(/'/g, "''")
  const res = await qboQuery<{ QueryResponse: { Item?: QboItem[] } }>(
    service,
    `select Id, Name, Sku, Type, SyncToken, QtyOnHand from Item where Sku = '${escaped}' maxresults 1`
  )
  return res.QueryResponse?.Item?.[0] || null
}

export async function createNonInventoryItem(
  service: QuickbooksModuleService,
  params: {
    name: string
    sku: string
    description?: string
    unitPrice?: number
    incomeAccountId: string
  }
): Promise<QboItem> {
  const body: Record<string, unknown> = {
    Name: params.name.slice(0, 100),
    Sku: params.sku.slice(0, 100),
    Type: "NonInventory",
    Taxable: true,
    IncomeAccountRef: { value: params.incomeAccountId },
  }
  if (params.description) body.Description = params.description.slice(0, 4000)
  if (typeof params.unitPrice === "number" && params.unitPrice > 0) {
    body.UnitPrice = Math.round(params.unitPrice * 100) / 100
  }
  const res = await qboRequest<{ Item: QboItem }>(service, {
    method: "POST",
    path: "/item?minorversion=75",
    body,
  })
  return res.Item
}

export interface QboInventoryAccounts {
  incomeAccountId: string
  assetAccountId: string
  cogsAccountId: string
}

// Finds the income, inventory-asset, and COGS accounts an Inventory item needs.
// Requires inventory tracking to be enabled in the QBO company.
export async function findInventoryAccounts(
  service: QuickbooksModuleService
): Promise<QboInventoryAccounts> {
  const res = await qboQuery<{ QueryResponse: { Account?: QboAccount[] } }>(
    service,
    "select Id, Name, AccountType, AccountSubType from Account maxresults 1000"
  )
  const accounts = res.QueryResponse?.Account || []
  const income =
    accounts.find((a) => a.AccountSubType === "SalesOfProductIncome") ||
    accounts.find((a) => a.AccountType === "Income")
  const asset =
    accounts.find((a) => a.AccountSubType === "Inventory") ||
    accounts.find(
      (a) => a.AccountType === "Other Current Asset" && /inventory/i.test(a.Name)
    )
  const cogs = accounts.find((a) => a.AccountType === "Cost of Goods Sold")
  if (!income) {
    throw new Error(
      "QuickBooks: no income account found (expected 'Sales of Product Income')."
    )
  }
  if (!asset || !cogs) {
    throw new Error(
      "QuickBooks: inventory accounts missing. Turn on inventory tracking in QuickBooks (Account and Settings → Sales → Products and services → Track quantity on hand), which creates the Inventory Asset and Cost of Goods Sold accounts."
    )
  }
  return {
    incomeAccountId: income.Id,
    assetAccountId: asset.Id,
    cogsAccountId: cogs.Id,
  }
}

// Creates an Inventory-type item (the only type that can carry QtyOnHand).
export async function createInventoryItem(
  service: QuickbooksModuleService,
  params: {
    name: string
    sku: string
    qtyOnHand: number
    unitPrice?: number
    description?: string
    accounts: QboInventoryAccounts
    invStartDate: string
  }
): Promise<QboItem> {
  const body: Record<string, unknown> = {
    Name: params.name.slice(0, 100),
    Sku: params.sku.slice(0, 100),
    Type: "Inventory",
    TrackQtyOnHand: true,
    QtyOnHand: Math.max(0, Math.floor(params.qtyOnHand)),
    InvStartDate: params.invStartDate,
    Taxable: true,
    IncomeAccountRef: { value: params.accounts.incomeAccountId },
    AssetAccountRef: { value: params.accounts.assetAccountId },
    ExpenseAccountRef: { value: params.accounts.cogsAccountId },
  }
  if (params.description) body.Description = params.description.slice(0, 4000)
  if (typeof params.unitPrice === "number" && params.unitPrice > 0) {
    body.UnitPrice = Math.round(params.unitPrice * 100) / 100
  }
  const res = await qboRequest<{ Item: QboItem }>(service, {
    method: "POST",
    path: "/item?minorversion=75",
    body,
  })
  return res.Item
}

// Finds an active item by exact display name (used as the self-heal fallback
// when a variant's join key changed, e.g. a UPC was added over an old SKU).
export async function findItemByName(
  service: QuickbooksModuleService,
  name: string
): Promise<QboItem | null> {
  const escaped = name.replace(/'/g, "''")
  const res = await qboQuery<{ QueryResponse: { Item?: QboItem[] } }>(
    service,
    `select Id, Name, Sku, Type, SyncToken, QtyOnHand, UnitPrice from Item where Name = '${escaped}' maxresults 1`
  )
  return res.QueryResponse?.Item?.[0] || null
}

// Pages through every active item in the QBO company (query API caps at 1000
// per page). Used by the master resync to diff QBO against the store catalog.
export async function listAllActiveItems(
  service: QuickbooksModuleService
): Promise<QboItem[]> {
  const out: QboItem[] = []
  const page = 1000
  let start = 1
  while (true) {
    const res = await qboQuery<{ QueryResponse: { Item?: QboItem[] } }>(
      service,
      `select Id, Name, Sku, Type, SyncToken, QtyOnHand, UnitPrice from Item where Active = true startposition ${start} maxresults ${page}`
    )
    const items = res.QueryResponse?.Item || []
    out.push(...items)
    if (items.length < page) break
    start += page
  }
  return out
}

// Sparse-updates arbitrary fields on an item (Sku, Name, QtyOnHand, UnitPrice…).
export async function updateItemSparse(
  service: QuickbooksModuleService,
  params: { itemId: string; syncToken: string; fields: Record<string, unknown> }
): Promise<QboItem> {
  const res = await qboRequest<{ Item: QboItem }>(service, {
    method: "POST",
    path: "/item?minorversion=75",
    body: {
      Id: params.itemId,
      SyncToken: params.syncToken,
      sparse: true,
      ...params.fields,
    },
  })
  return res.Item
}

// Retires an item. QBO never hard-deletes: it marks the item inactive and
// appends "(deleted)" to its name, which also frees the name for reuse.
export async function deactivateItem(
  service: QuickbooksModuleService,
  params: { itemId: string; syncToken: string }
): Promise<QboItem> {
  return updateItemSparse(service, {
    itemId: params.itemId,
    syncToken: params.syncToken,
    fields: { Active: false },
  })
}

// Finds the account inventory adjustments post against — QBO's auto-created
// "Inventory Shrinkage" account, falling back to any Cost of Goods Sold.
export async function findAdjustmentAccountId(
  service: QuickbooksModuleService
): Promise<string> {
  const res = await qboQuery<{ QueryResponse: { Account?: QboAccount[] } }>(
    service,
    "select Id, Name, AccountType, AccountSubType from Account where AccountType = 'Cost of Goods Sold' maxresults 200"
  )
  const accounts = res.QueryResponse?.Account || []
  const shrinkage = accounts.find((a) => /shrinkage/i.test(a.Name))
  const chosen = shrinkage || accounts[0]
  if (!chosen) {
    throw new Error(
      "QuickBooks: no Cost of Goods Sold account found for inventory adjustments. Turn on inventory tracking first."
    )
  }
  return chosen.Id
}

// Moves an Inventory item's on-hand by a delta via an InventoryAdjustment
// transaction. QBO SILENTLY IGNORES QtyOnHand on Item updates after creation
// (verified in production 2026-07-21) — this transaction is the only way.
export async function createInventoryAdjustment(
  service: QuickbooksModuleService,
  params: {
    itemId: string
    qtyDiff: number
    adjustAccountId: string
    note?: string
  }
): Promise<void> {
  await qboRequest(service, {
    method: "POST",
    path: "/inventoryadjustment?minorversion=75",
    body: {
      DocNumber: `WS${Date.now().toString(36).toUpperCase()}`.slice(0, 21),
      TxnDate: new Date().toISOString().slice(0, 10),
      AdjustAccountRef: { value: params.adjustAccountId },
      PrivateNote: params.note?.slice(0, 4000),
      Line: [
        {
          DetailType: "ItemAdjustmentLineDetail",
          ItemAdjustmentLineDetail: {
            QtyDiff: params.qtyDiff,
            ItemRef: { value: params.itemId },
          },
        },
      ],
    },
  })
}

// Fetches a single item by its QBO Id (returns Sku, QtyOnHand, SyncToken).
export async function getItemById(
  service: QuickbooksModuleService,
  id: string
): Promise<QboItem | null> {
  const res = await qboRequest<{ Item: QboItem }>(service, {
    method: "GET",
    path: `/item/${encodeURIComponent(id)}?minorversion=75`,
  })
  return res.Item || null
}
