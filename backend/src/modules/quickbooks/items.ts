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

// Sets an Inventory item's absolute quantity on hand via a sparse update.
// QBO records the difference as an inventory adjustment. Verify against the
// sandbox; if QBO rejects the sparse QtyOnHand write, switch to an
// InventoryAdjustment transaction.
export async function setItemQuantity(
  service: QuickbooksModuleService,
  params: { itemId: string; syncToken: string; qtyOnHand: number }
): Promise<QboItem> {
  const res = await qboRequest<{ Item: QboItem }>(service, {
    method: "POST",
    path: "/item?minorversion=75",
    body: {
      Id: params.itemId,
      SyncToken: params.syncToken,
      sparse: true,
      QtyOnHand: Math.max(0, Math.floor(params.qtyOnHand)),
    },
  })
  return res.Item
}
