import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import { Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import {
  QB_DESCRIPTION_MAX,
  QB_DESCRIPTION_METADATA_KEY,
  sanitizeQbDescription,
} from "../../modules/quickbooks/qb-description"

declare const __BACKEND_URL__: string | undefined

// The SEPARATE QuickBooks Description — a short plain-text line printed on
// QuickBooks invoices/receipts/sales forms. Completely independent from the
// Website Description above it on this page: neither ever overwrites the
// other, and blank here means blank in QuickBooks (the normal default).
const ProductQuickbooksDescriptionWidget = ({
  data,
}: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [value, setValue] = useState("")
  const [saved, setSaved] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `${backendUrl}/admin/products/${data.id}?fields=id,metadata`,
          { credentials: "include" },
        )
        if (!res.ok) throw new Error()
        const body = await res.json()
        const v = sanitizeQbDescription(
          body?.product?.metadata?.[QB_DESCRIPTION_METADATA_KEY],
        )
        if (!cancelled) {
          setValue(v)
          setSaved(v)
        }
      } catch {
        if (!cancelled) toast.error("Failed to load the QuickBooks description")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backendUrl, data.id])

  const save = async () => {
    const clean = sanitizeQbDescription(value)
    setSaving(true)
    try {
      const res = await fetch(`${backendUrl}/admin/quickbooks/description`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: data.id, value: clean }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || "Save failed")
      }
      setValue(clean)
      setSaved(clean)
      if (body?.note) {
        toast.success(`Saved. ${body.note}`)
      } else if (clean) {
        toast.success(
          `Saved and pushed to QuickBooks (${body?.pushed ?? 0} item${(body?.pushed ?? 0) === 1 ? "" : "s"})`,
        )
      } else {
        toast.success("Saved — QuickBooks description is blank")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const dirty = sanitizeQbDescription(value) !== saved

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">QuickBooks Description</Heading>
        <Text size="small" className="text-ui-fg-muted">
          {sanitizeQbDescription(value).length}/{QB_DESCRIPTION_MAX}
        </Text>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Optional. Printed only on QuickBooks invoices, receipts, and sales
          forms. One plain-text line — no formatting. Blank is normal: the
          website description is never sent to QuickBooks.
        </Text>
        <Input
          value={value}
          maxLength={QB_DESCRIPTION_MAX}
          placeholder="Leave blank unless a sales-form line is needed"
          disabled={loading || saving}
          onChange={(e) =>
            setValue(e.target.value.replace(/[\r\n]+/g, " "))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (dirty && !saving) save()
            }
          }}
        />
        <div className="flex items-center justify-end">
          <Button
            variant="primary"
            size="small"
            disabled={!dirty || loading || saving}
            isLoading={saving}
            onClick={save}
          >
            Save to QuickBooks
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductQuickbooksDescriptionWidget
