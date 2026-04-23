import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

declare const __BACKEND_URL__: string | undefined

type LocationLevel = {
  id: string
  location_id: string
  stocked_quantity: number
}

type InventoryItem = {
  id: string
  location_levels?: LocationLevel[]
}

type VariantRow = {
  id: string
  title: string
  sku: string | null
  price: number | null
  currency: string
  stock: number | null
  inventory_item_id: string | null
  location_id: string | null
  location_level_id: string | null
}

const USD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const VariantQuickEditWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [rows, setRows] = useState<VariantRow[]>([])
  const [loading, setLoading] = useState(true)

  const [priceEdit, setPriceEdit] = useState<VariantRow | null>(null)
  const [priceValue, setPriceValue] = useState("")
  const [stockEdit, setStockEdit] = useState<VariantRow | null>(null)
  const [stockValue, setStockValue] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const productRes = await fetch(
        `${backendUrl}/admin/products/${data.id}`,
        { credentials: "include" },
      )
      const product = productRes.ok
        ? (await productRes.json())?.product
        : null

      const variants: any[] =
        product?.variants ?? (data.variants as any[]) ?? []

      const inventoryByVariant = new Map<
        string,
        { inventory_item_id: string; location_id: string; stock: number }
      >()

      for (const v of variants) {
        if (!v.sku) continue
        try {
          const invRes = await fetch(
            `${backendUrl}/admin/inventory-items?sku=${encodeURIComponent(v.sku)}`,
            { credentials: "include" },
          )
          if (!invRes.ok) continue
          const invData = await invRes.json()
          const invItem = invData?.inventory_items?.[0]
          if (!invItem?.id) continue

          const levelRes = await fetch(
            `${backendUrl}/admin/inventory-items/${invItem.id}/location-levels`,
            { credentials: "include" },
          )
          if (!levelRes.ok) continue
          const lvlData = await levelRes.json()
          const level =
            lvlData?.inventory_levels?.[0] ?? lvlData?.location_levels?.[0]
          if (level) {
            inventoryByVariant.set(v.id, {
              inventory_item_id: invItem.id,
              location_id: level.location_id,
              stock: Number(level.stocked_quantity ?? 0),
            })
          }
        } catch {
          // per-variant lookup failure — leave Edit Stock disabled for this row
        }
      }

      const next: VariantRow[] = variants.map((v: any) => {
        const usdPrice = (v.prices ?? []).find(
          (p: any) => (p.currency_code ?? "").toLowerCase() === "usd",
        )
        const inv = inventoryByVariant.get(v.id)
        return {
          id: v.id,
          title: v.title ?? "",
          sku: v.sku ?? null,
          price: usdPrice ? Number(usdPrice.amount) : null,
          currency: "USD",
          stock: inv?.stock ?? null,
          inventory_item_id: inv?.inventory_item_id ?? null,
          location_id: inv?.location_id ?? null,
          location_level_id: null,
        }
      })
      setRows(next)
    } catch {
      toast.error("Failed to load variants")
    } finally {
      setLoading(false)
    }
  }, [backendUrl, data.id, data.variants])

  useEffect(() => {
    load()
  }, [load])

  const openPrice = (row: VariantRow) => {
    setPriceEdit(row)
    setPriceValue(row.price != null ? String(row.price) : "")
  }
  const openStock = (row: VariantRow) => {
    setStockEdit(row)
    setStockValue(row.stock != null ? String(row.stock) : "")
  }

  const savePrice = async () => {
    if (!priceEdit) return
    const amount = parseFloat(priceValue)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid price")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `${backendUrl}/admin/products/${data.id}/variants/${priceEdit.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: [{ currency_code: "usd", amount }],
          }),
        },
      )
      if (!res.ok) throw new Error()
      toast.success("Price updated")
      setPriceEdit(null)
      await load()
    } catch {
      toast.error("Failed to update price")
    } finally {
      setSaving(false)
    }
  }

  const saveStock = async () => {
    if (!stockEdit) return
    if (!stockEdit.inventory_item_id || !stockEdit.location_id) {
      toast.error("This variant has no inventory location set up yet")
      return
    }
    const qty = parseInt(stockValue, 10)
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid quantity")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `${backendUrl}/admin/inventory-items/${stockEdit.inventory_item_id}/location-levels/${stockEdit.location_id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stocked_quantity: qty }),
        },
      )
      if (!res.ok) throw new Error()
      toast.success("Stock updated")
      setStockEdit(null)
      await load()
    } catch {
      toast.error("Failed to update stock")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Variants — Quick Edit</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Set price and stock without opening a variant.
        </Text>
      </div>

      {loading ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">Loading variants…</Text>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            No variants on this product yet.
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Price</Table.HeaderCell>
              <Table.HeaderCell>Stock</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.title || "—"}</Table.Cell>
                <Table.Cell className="text-ui-fg-subtle">
                  {row.sku ?? "—"}
                </Table.Cell>
                <Table.Cell>
                  {row.price != null ? USD(row.price) : "—"}
                </Table.Cell>
                <Table.Cell>
                  {row.stock != null ? row.stock : "—"}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => openPrice(row)}
                    >
                      Edit Price
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => openStock(row)}
                      disabled={!row.inventory_item_id || !row.location_id}
                    >
                      Edit Stock
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <FocusModal open={!!priceEdit} onOpenChange={(o) => !o && setPriceEdit(null)}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Edit Price</FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col gap-4 p-6 max-w-md">
            <Text size="small" className="text-ui-fg-subtle">
              {priceEdit?.title}
            </Text>
            <div className="flex flex-col gap-1.5">
              <Label>USD Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPriceEdit(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={savePrice} isLoading={saving}>
                Save
              </Button>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal open={!!stockEdit} onOpenChange={(o) => !o && setStockEdit(null)}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Edit Stock</FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col gap-4 p-6 max-w-md">
            <Text size="small" className="text-ui-fg-subtle">
              {stockEdit?.title}
            </Text>
            <div className="flex flex-col gap-1.5">
              <Label>Stocked Quantity</Label>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStockEdit(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveStock} isLoading={saving}>
                Save
              </Button>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default VariantQuickEditWidget
