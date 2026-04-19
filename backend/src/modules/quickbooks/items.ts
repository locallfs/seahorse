import type QuickbooksModuleService from "./service"
import { qboQuery, qboRequest } from "./qbo-client"

interface QboAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType?: string
}

interface QboItem {
  Id: string
  Name: string
  Sku?: string
  Type: "Service" | "Inventory" | "NonInventory"
  SyncToken: string
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
    `select Id, Name, Sku, Type, SyncToken from Item where Sku = '${escaped}' maxresults 1`
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
