import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  Textarea,
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
  water_conditions?: string
  range?: string
}

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

const isLiveAnimal = (title: string | null | undefined) => {
  if (!title) return false
  const t = title.toLowerCase()
  return LIVE_KEYWORDS.some((kw) => t.includes(kw))
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
    water_conditions: typeof raw.water_conditions === "string" ? raw.water_conditions : "",
    range: typeof raw.range === "string" ? raw.range : "",
  }
}

const LiveAnimalPadsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const showWidget = isLiveAnimal(data.title)
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

  const save = async () => {
    setSaving(true)
    try {
      const cleaned: Pads = {}
      ;(Object.keys(pendingPads) as (keyof Pads)[]).forEach((k) => {
        const v = pendingPads[k]?.trim()
        if (v) cleaned[k] = v
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
        value={pendingPads[key] ?? ""}
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
        value={pendingPads[key] ?? ""}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        disabled={saving}
      />
    </div>
  )

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
        <div className="flex flex-col gap-1">
          <Text size="small" className="text-ui-fg-subtle">Water Conditions</Text>
          <Textarea
            value={pendingPads.water_conditions ?? ""}
            onChange={(e) => update("water_conditions", e.target.value)}
            placeholder="e.g. 72-78°F, dKH 8-12, pH 8.1-8.4, sg 1.020-1.025"
            disabled={saving}
            rows={2}
          />
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
