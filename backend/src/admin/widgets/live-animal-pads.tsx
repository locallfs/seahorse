import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMemo, useState } from "react"

declare const __BACKEND_URL__: string | undefined

type Pads = {
  care_level?: string
  reef_safe?: string
  min_tank_size?: string
  max_size?: string
  diet?: string
  temperament?: string
  range?: string
  flow?: string[]
  placement?: string[]
  lighting?: string[]
  calcium?: string
  magnesium?: string
  alkalinity?: string
  nitrates?: string
  phosphates?: string
  temperature?: string
  ph?: string
  salinity?: string
}

const MULTI_KEYS = ["flow", "placement", "lighting"] as const
type MultiKey = (typeof MULTI_KEYS)[number]
const FLOW_OPTIONS = ["Low", "Moderate", "Indirect", "Heavy"]
const PLACEMENT_OPTIONS = ["Low", "Mid-Low", "Mid", "Mid-High", "High"]
const LIGHTING_OPTIONS = ["Low", "Low-Mid", "Mid", "Mid-High", "High"]

const WATER_FIELDS: Array<{ key: keyof Pads; label: string; placeholder: string }> = [
  { key: "calcium", label: "Calcium", placeholder: "e.g. 420 ppm" },
  { key: "magnesium", label: "Magnesium", placeholder: "e.g. 1350 ppm" },
  { key: "alkalinity", label: "Alkalinity", placeholder: "e.g. 8-10 dKH" },
  { key: "nitrates", label: "Nitrates", placeholder: "e.g. < 10 ppm" },
  { key: "phosphates", label: "Phosphates", placeholder: "e.g. < 0.05 ppm" },
  { key: "temperature", label: "Temperature", placeholder: "e.g. 75-78°F" },
  { key: "ph", label: "PH", placeholder: "e.g. 8.1-8.4" },
  { key: "salinity", label: "Salinity", placeholder: "e.g. 1.023-1.025 sg" },
]

const LIVE_CATEGORY_HANDLES = ["fish", "corals", "inverts"]

const LIVE_KEYWORDS = [
  "fish",
  "coral",
  "invert",
  "shrimp",
  "crab",
  "snail",
  "anemone",
  "seahorse",
  "clown",
  "tang",
  "wrasse",
  "goby",
  "angel",
  "urchin",
  "starfish",
]

const isLiveAnimalByTitle = (title: string | null | undefined) => {
  if (!title) return false
  const t = title.toLowerCase()
  return LIVE_KEYWORDS.some((kw) => t.includes(kw))
}

const isLiveAnimalByCategories = (
  categories: { handle?: string | null }[] | null | undefined,
) => {
  if (!categories?.length) return false
  return categories.some(
    (c) => !!c?.handle && LIVE_CATEGORY_HANDLES.includes(c.handle),
  )
}

const stringArrayFromRaw = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
}

const padsFromMetadata = (metadata: Record<string, unknown> | null | undefined): Pads => {
  const raw = (metadata?.pads ?? {}) as Record<string, unknown>
  return {
    care_level: typeof raw.care_level === "string" ? raw.care_level : "",
    reef_safe: typeof raw.reef_safe === "string" ? raw.reef_safe : "",
    min_tank_size: typeof raw.min_tank_size === "string" ? raw.min_tank_size : "",
    max_size: typeof raw.max_size === "string" ? raw.max_size : "",
    diet: typeof raw.diet === "string" ? raw.diet : "",
    temperament: typeof raw.temperament === "string" ? raw.temperament : "",
    range: typeof raw.range === "string" ? raw.range : "",
    flow: stringArrayFromRaw(raw.flow),
    placement: stringArrayFromRaw(raw.placement),
    lighting: stringArrayFromRaw(raw.lighting),
    calcium: typeof raw.calcium === "string" ? raw.calcium : "",
    magnesium: typeof raw.magnesium === "string" ? raw.magnesium : "",
    alkalinity: typeof raw.alkalinity === "string" ? raw.alkalinity : "",
    nitrates: typeof raw.nitrates === "string" ? raw.nitrates : "",
    phosphates: typeof raw.phosphates === "string" ? raw.phosphates : "",
    temperature: typeof raw.temperature === "string" ? raw.temperature : "",
    ph: typeof raw.ph === "string" ? raw.ph : "",
    salinity: typeof raw.salinity === "string" ? raw.salinity : "",
  }
}

const LiveAnimalPadsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const showWidget =
    isLiveAnimalByCategories((data as any).categories) ||
    isLiveAnimalByTitle(data.title)
  const initialPads = useMemo(
    () => padsFromMetadata(data.metadata as Record<string, unknown> | null | undefined),
    [data.metadata],
  )
  const [savedPads, setSavedPads] = useState<Pads>(initialPads)
  const [pendingPads, setPendingPads] = useState<Pads>(initialPads)
  const [saving, setSaving] = useState(false)

  if (!showWidget) return null

  const dirty = JSON.stringify(pendingPads) !== JSON.stringify(savedPads)

  const update = (key: keyof Pads, value: string) => {
    setPendingPads((prev) => ({ ...prev, [key]: value }))
  }

  const toggleMulti = (key: MultiKey, value: string) => {
    setPendingPads((prev) => {
      const current = (prev[key] as string[] | undefined) ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const cleaned: Pads = {}
      ;(Object.keys(pendingPads) as (keyof Pads)[]).forEach((k) => {
        const v = pendingPads[k]
        if (Array.isArray(v)) {
          if (v.length) (cleaned as any)[k] = v
        } else if (typeof v === "string" && v.trim()) {
          (cleaned as any)[k] = v.trim()
        }
      })
      const nextMetadata = {
        ...(data.metadata as Record<string, unknown> | null ?? {}),
        pads: cleaned,
      }
      const res = await fetch(`${backendUrl}/admin/products/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: nextMetadata }),
      })
      if (!res.ok) throw new Error()
      setSavedPads(cleaned)
      setPendingPads(cleaned)
      toast.success("Species info saved")
    } catch {
      toast.error("Failed to save species info")
      setPendingPads(savedPads)
    } finally {
      setSaving(false)
    }
  }

  const selectField = (
    key: keyof Pads,
    label: string,
    options: string[],
  ) => (
    <div className="flex flex-col gap-1">
      <Text size="small" className="text-ui-fg-subtle">{label}</Text>
      <Select
        value={(pendingPads[key] as string | undefined) ?? ""}
        onValueChange={(v) => update(key, v === "__none__" ? "" : v)}
        disabled={saving}
      >
        <Select.Trigger>
          <Select.Value placeholder="Not set" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="__none__">Not set</Select.Item>
          {options.map((o) => (
            <Select.Item key={o} value={o}>{o}</Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  )

  const textField = (key: keyof Pads, label: string, placeholder: string) => (
    <div className="flex flex-col gap-1">
      <Text size="small" className="text-ui-fg-subtle">{label}</Text>
      <Input
        value={(pendingPads[key] as string | undefined) ?? ""}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        disabled={saving}
      />
    </div>
  )

  const multiField = (key: MultiKey, label: string, options: string[]) => {
    const selected = (pendingPads[key] as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-2">
        <Text size="small" className="text-ui-fg-subtle">
          {label} <span className="text-ui-fg-muted">(multi-select)</span>
        </Text>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const active = selected.includes(opt)
            return (
              <Button
                key={opt}
                type="button"
                variant={active ? "primary" : "secondary"}
                size="small"
                onClick={() => toggleMulti(key, opt)}
                disabled={saving}
              >
                {opt}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Species Info Pads</Heading>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Leave a field blank to hide that pad on the storefront. Only filled fields render.
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectField("care_level", "Care Level", ["Easy", "Moderate", "Difficult", "Expert"])}
          {selectField("reef_safe", "Reef Safe", ["Yes", "With Caution", "No"])}
          {textField("min_tank_size", "Min Tank Size", "e.g. 75 gallons")}
          {textField("max_size", "Max Size", 'e.g. 8"')}
          {textField("diet", "Diet", "e.g. Carnivore")}
          {selectField("temperament", "Temperament", ["Peaceful", "Semi-Aggressive", "Aggressive"])}
          {textField("range", "Range", "e.g. Indo-Pacific")}
        </div>
        {multiField("flow", "Flow", FLOW_OPTIONS)}
        {multiField("placement", "Placement", PLACEMENT_OPTIONS)}
        {multiField("lighting", "Lighting", LIGHTING_OPTIONS)}
        <div className="flex flex-col gap-3 pt-4 border-t border-ui-border-base">
          <Heading level="h3">Water Conditions</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Target parameters for this species. Only filled fields render on the storefront.
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WATER_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>{textField(key, label, placeholder)}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="primary"
            size="small"
            disabled={!dirty || saving}
            isLoading={saving}
            onClick={save}
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default LiveAnimalPadsWidget
