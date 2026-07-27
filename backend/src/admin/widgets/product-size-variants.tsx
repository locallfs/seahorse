import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

declare const __BACKEND_URL__: string | undefined

// The Size Variants editor. One product keeps its shared title, description,
// images, tags, and QuickBooks Description; every size here is a variant with
// its own price, optional sale price, SKU, UPC/barcode, and stock. Fixed fish
// and coral lists render in their required order; supply sizes are custom and
// staff-orderable. Saving goes through /admin/size-variants/:id, which
// validates (duplicates, foreign SKUs/UPCs) and executes via core workflows.

type SizeSystem = "fish" | "coral" | "supply"

type ServerSize = {
  variant_id: string
  value: string | null
  title: string | null
  sku: string | null
  upc: string | null
  barcode: string | null
  price: number | null
  sale_price: number | null
  quantity: number | null
  disabled: boolean
}

type ServerState = {
  size_system: SizeSystem | null
  size_order: string[] | null
  available: {
    fish: string[]
    coral: string[]
    supply_standard: string[]
  }
  sizes: ServerSize[]
}

type Row = {
  value: string
  enabled: boolean
  price: string
  sale_price: string
  sku: string
  upc_barcode: string
  quantity: string
  disabled: boolean
  variant_id: string | null
  /** quantity as loaded, to skip unchanged inventory writes */
  loadedQuantity: string
}

const emptyRow = (value: string): Row => ({
  value,
  enabled: false,
  price: "",
  sale_price: "",
  sku: "",
  upc_barcode: "",
  quantity: "",
  disabled: false,
  variant_id: null,
  loadedQuantity: "",
})

const rowFromServer = (value: string, s: ServerSize): Row => ({
  value,
  enabled: true,
  price: s.price != null ? String(s.price) : "",
  sale_price: s.sale_price != null ? String(s.sale_price) : "",
  sku: s.sku ?? "",
  upc_barcode: s.upc ?? s.barcode ?? "",
  quantity: s.quantity != null ? String(s.quantity) : "",
  disabled: s.disabled,
  variant_id: s.variant_id,
  loadedQuantity: s.quantity != null ? String(s.quantity) : "",
})

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase()

const ProductSizeVariantsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [server, setServer] = useState<ServerState | null>(null)
  const [system, setSystem] = useState<SizeSystem | "none">("none")
  const [rows, setRows] = useState<Row[]>([])
  const [customValue, setCustomValue] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  // Preview of what saving would do — staff sees every SKU (typed or
  // auto-generated) before anything is written.
  const [confirm, setConfirm] = useState<{
    creates: Array<{ value: string; sku: string }>
    convert: { value: string; sku: string | null } | null
  } | null>(null)

  const buildRows = useCallback(
    (state: ServerState, sys: SizeSystem | "none"): Row[] => {
      if (sys === "none") return []
      const matched = (value: string) =>
        state.sizes.find((s) => norm(s.value ?? s.title ?? "") === norm(value))
      if (sys === "fish" || sys === "coral") {
        const list = sys === "fish" ? state.available.fish : state.available.coral
        return list.map((value) => {
          const hit = matched(value)
          return hit ? rowFromServer(value, hit) : emptyRow(value)
        })
      }
      // supply: existing sizes in staff order first, then any stragglers
      const ordered: Row[] = []
      const used = new Set<string>()
      for (const value of state.size_order ?? []) {
        const hit = matched(value)
        if (hit) {
          ordered.push(rowFromServer(value, hit))
          used.add(hit.variant_id)
        }
      }
      for (const s of state.sizes) {
        if (used.has(s.variant_id)) continue
        const value = s.value ?? s.title ?? ""
        if (!value) continue
        ordered.push(rowFromServer(value, s))
      }
      return ordered
    },
    []
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/admin/size-variants/${data.id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("load failed")
      const state: ServerState = await res.json()
      setServer(state)
      const sys = state.size_system ?? "none"
      setSystem(sys)
      setRows(buildRows(state, sys))
    } catch {
      toast.error("Failed to load size variants")
    } finally {
      setLoading(false)
    }
  }, [backendUrl, data.id, buildRows])

  useEffect(() => {
    load()
  }, [load])

  const changeSystem = (sys: SizeSystem | "none") => {
    setSystem(sys)
    setErrors([])
    if (server) setRows(buildRows(server, sys))
  }

  const patchRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const moveRow = (idx: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev]
      const j = idx + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  const addCustom = (value: string) => {
    const v = value.replace(/\s+/g, " ").trim()
    if (!v) return
    if (rows.some((r) => norm(r.value) === norm(v))) {
      toast.error(`Size "${v}" is already in the list`)
      return
    }
    setRows((prev) => [...prev, { ...emptyRow(v), enabled: true }])
    setCustomValue("")
  }

  const removeRow = (idx: number) => {
    const row = rows[idx]
    if (row.variant_id) {
      toast.error(
        "This size already exists as a variant — use the Hidden switch to stop selling it."
      )
      return
    }
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const enabledRows = useMemo(() => rows.filter((r) => r.enabled), [rows])

  const buildSizesPayload = (skuByValue: Record<string, string> = {}) =>
    enabledRows.map((r) => ({
      value: r.value,
      price: parseFloat(r.price),
      sale_price: r.sale_price.trim() === "" ? null : parseFloat(r.sale_price),
      // On confirm, the previewed (minted) SKU is sent explicitly so exactly
      // what staff saw is what gets saved.
      sku: r.sku.trim() || skuByValue[r.value] || null,
      upc_barcode: r.upc_barcode.trim() || null,
      quantity: r.quantity.trim() === "" ? null : parseInt(r.quantity, 10),
      disabled: r.disabled,
    }))

  // Step 1: dry-run on the server. If any variant would be created or
  // converted, show its exact SKU and wait for staff confirmation.
  const requestSave = async () => {
    if (system === "none") {
      toast.error("Pick a size system first")
      return
    }
    setErrors([])
    setConfirm(null)
    setSaving(true)
    try {
      const res = await fetch(`${backendUrl}/admin/size-variants/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: true,
          size_system: system,
          sizes: buildSizesPayload(),
        }),
      })
      const json: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(json?.errors ?? [json?.error ?? "Preview failed"])
        toast.error("Sizes were not saved — fix the issues below")
        return
      }
      const creates = json?.plan?.create ?? []
      const convert = json?.plan?.convert ?? null
      if (creates.length > 0 || convert) {
        setConfirm({ creates, convert })
        return
      }
      await executeSave({})
    } catch (err) {
      toast.error((err as Error)?.message || "Preview failed")
    } finally {
      setSaving(false)
    }
  }

  // Step 2: the real save, locking in the previewed SKUs.
  const executeSave = async (skuByValue: Record<string, string>) => {
    setSaving(true)
    try {
      const res = await fetch(`${backendUrl}/admin/size-variants/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size_system: system,
          sizes: buildSizesPayload(skuByValue),
        }),
      })
      const json: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(json?.errors ?? [json?.error ?? "Save failed"])
        toast.error("Sizes were not saved — fix the issues below")
        return
      }
      setConfirm(null)

      // Stock goes through the proven variant-inventory route, per size.
      const variantIdByValue: Record<string, string> = json?.variants ?? {}
      let stockFailures = 0
      for (const r of enabledRows) {
        const qty = r.quantity.trim() === "" ? null : parseInt(r.quantity, 10)
        if (qty == null || r.quantity === r.loadedQuantity) continue
        const variantId = r.variant_id ?? variantIdByValue[r.value]
        if (!variantId) continue
        const stockRes = await fetch(
          `${backendUrl}/admin/variant-inventory/${variantId}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stocked_quantity: qty }),
          }
        )
        if (!stockRes.ok) stockFailures++
      }
      if (stockFailures > 0) {
        toast.warning(
          `Sizes saved, but ${stockFailures} stock update(s) failed — set them from the Variants table.`
        )
      } else {
        toast.success("Sizes saved")
      }
      await load()
    } catch (err) {
      toast.error((err as Error)?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const fixedList = system === "fish" || system === "coral"

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">Size Variants</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            One product, one description — each size gets its own price, SKU,
            stock, and QuickBooks item.
          </Text>
        </div>
        <div className="w-48">
          <Select
            value={system}
            onValueChange={(v) => changeSystem(v as SizeSystem | "none")}
          >
            <Select.Trigger>
              <Select.Value placeholder="Size system" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="none">No Size Variants</Select.Item>
              <Select.Item value="fish">Fish Sizes</Select.Item>
              <Select.Item value="coral">Coral Sizes</Select.Item>
              <Select.Item value="supply">Supply Sizes</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            Loading sizes…
          </Text>
        </div>
      ) : system === "none" ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            This product has no size variants. Pick Fish, Coral, or Supply
            sizes above to enable them — existing products keep working as-is.
          </Text>
        </div>
      ) : (
        <div className="px-6 py-4 flex flex-col gap-4">
          {errors.length > 0 && (
            <div className="rounded-md border border-ui-border-error bg-ui-bg-subtle px-4 py-3">
              {errors.map((e) => (
                <Text key={e} size="small" className="text-ui-fg-error">
                  {e}
                </Text>
              ))}
            </div>
          )}

          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>On</Table.HeaderCell>
                <Table.HeaderCell>Size</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Sale</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>UPC / Barcode</Table.HeaderCell>
                <Table.HeaderCell>Stock</Table.HeaderCell>
                <Table.HeaderCell>Hidden</Table.HeaderCell>
                {!fixedList && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row, idx) => (
                <Table.Row key={`${row.value}-${idx}`}>
                  <Table.Cell>
                    <Switch
                      checked={row.enabled}
                      disabled={!!row.variant_id}
                      onCheckedChange={(v) => patchRow(idx, { enabled: v })}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" weight="plus">
                      {row.value}
                    </Text>
                    {row.variant_id ? (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        existing
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24"
                      value={row.price}
                      disabled={!row.enabled}
                      onChange={(e) => patchRow(idx, { price: e.target.value })}
                      placeholder="0.00"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24"
                      value={row.sale_price}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        patchRow(idx, { sale_price: e.target.value })
                      }
                      placeholder="—"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      className="w-36"
                      value={row.sku}
                      disabled={!row.enabled}
                      onChange={(e) => patchRow(idx, { sku: e.target.value })}
                      placeholder="auto (shown before save)"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      className="w-36"
                      value={row.upc_barcode}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        patchRow(idx, { upc_barcode: e.target.value })
                      }
                      placeholder="—"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="w-20"
                      value={row.quantity}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        patchRow(idx, { quantity: e.target.value })
                      }
                      placeholder="—"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Switch
                      checked={row.disabled}
                      disabled={!row.enabled}
                      onCheckedChange={(v) => patchRow(idx, { disabled: v })}
                    />
                  </Table.Cell>
                  {!fixedList && (
                    <Table.Cell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() => moveRow(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() => moveRow(idx, 1)}
                          disabled={idx === rows.length - 1}
                        >
                          ↓
                        </Button>
                        {!row.variant_id && (
                          <Button
                            size="small"
                            variant="transparent"
                            onClick={() => removeRow(idx)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {system === "supply" && (
            <div className="flex flex-wrap items-center gap-2">
              {(server?.available.supply_standard ?? []).map((s) => (
                <Button
                  key={s}
                  size="small"
                  variant="secondary"
                  disabled={rows.some((r) => norm(r.value) === norm(s))}
                  onClick={() => addCustom(s)}
                >
                  + {s}
                </Button>
              ))}
              <Input
                className="w-44"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom(customValue)
                }}
                placeholder='Custom size (e.g. 500 ml, 36")'
              />
              <Button
                size="small"
                variant="secondary"
                onClick={() => addCustom(customValue)}
              >
                Add size
              </Button>
            </div>
          )}

          {confirm && (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-3 flex flex-col gap-2">
              <Text size="small" weight="plus">
                Review before saving — these SKUs will be used:
              </Text>
              {confirm.convert && (
                <Text size="small" className="text-ui-fg-subtle">
                  Existing variant becomes “{confirm.convert.value}” — SKU{" "}
                  {confirm.convert.sku ?? "(stays blank)"} (unchanged)
                </Text>
              )}
              {confirm.creates.map((c) => (
                <Text key={c.value} size="small" className="text-ui-fg-subtle">
                  New size “{c.value}” — SKU {c.sku}
                </Text>
              ))}
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setConfirm(null)}
                  disabled={saving}
                >
                  Go Back
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    executeSave(
                      Object.fromEntries(
                        confirm.creates.map((c) => [c.value, c.sku])
                      )
                    )
                  }
                  isLoading={saving}
                >
                  Confirm &amp; Save
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">
              {enabledRows.length} size{enabledRows.length === 1 ? "" : "s"}{" "}
              enabled. New sizes get their own QuickBooks item automatically;
              existing mappings are never changed.
            </Text>
            <Button onClick={requestSave} isLoading={saving} disabled={loading || !!confirm}>
              Save Sizes
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSizeVariantsWidget
