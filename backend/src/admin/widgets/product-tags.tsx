import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

declare const __BACKEND_URL__: string | undefined

type Tag = { id: string; value: string }

const MAIN_TAG_NAMES = [
  "Fish",
  "Corals",
  "Inverts",
  "New Arrivals",
  "Supplies",
  "WYSIWYG Fish",
  "WYSIWYG Corals",
]
const MAIN_TAG_SET = new Set(MAIN_TAG_NAMES.map((n) => n.toLowerCase()))
const mainOrder = (v: string) => {
  const i = MAIN_TAG_NAMES.findIndex(
    (n) => n.toLowerCase() === v.toLowerCase(),
  )
  return i === -1 ? MAIN_TAG_NAMES.length : i
}

const ProductTagsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const initial = new Set<string>(
      ((data.tags ?? []) as Array<{ id: string }>).map((t) => t.id),
    )
    setSelected(initial)
    setSavedIds(initial)
  }, [data.id, data.tags])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const pageSize = 200
        const all: Tag[] = []
        let offset = 0
        while (!cancelled) {
          const res = await fetch(
            `${backendUrl}/admin/product-tags?limit=${pageSize}&offset=${offset}&fields=id,value`,
            { credentials: "include" },
          )
          if (!res.ok) break
          const body = await res.json()
          const page: Tag[] = body.product_tags ?? []
          all.push(...page)
          if (page.length < pageSize) break
          offset += page.length
          if (offset > 10000) break
        }
        if (!cancelled) {
          all.sort((a, b) => a.value.localeCompare(b.value))
          setAllTags(all)
        }
      } catch {
        if (!cancelled) toast.error("Failed to load tags")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backendUrl])

  const dirty = useMemo(() => {
    if (selected.size !== savedIds.size) return true
    for (const id of selected) if (!savedIds.has(id)) return true
    return false
  }, [selected, savedIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allTags
    return allTags.filter((t) => t.value.toLowerCase().includes(q))
  }, [allTags, query])

  const { mainTags, otherTags } = useMemo(() => {
    const main: Tag[] = []
    const other: Tag[] = []
    for (const t of filtered) {
      if (MAIN_TAG_SET.has(t.value.toLowerCase())) main.push(t)
      else other.push(t)
    }
    main.sort((a, b) => mainOrder(a.value) - mainOrder(b.value))
    other.sort((a, b) => a.value.localeCompare(b.value))
    return { mainTags: main, otherTags: other }
  }, [filtered])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const tagIds = Array.from(selected)
      const res = await fetch(`${backendUrl}/admin/products/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagIds.map((id) => ({ id })) }),
      })
      if (!res.ok) throw new Error()
      setSavedIds(new Set(selected))
      toast.success("Tags saved")
    } catch {
      toast.error("Failed to save tags")
      setSelected(savedIds)
    } finally {
      setSaving(false)
    }
  }

  const createTag = async () => {
    const value = newTag.trim()
    if (!value) return
    setSaving(true)
    try {
      const res = await fetch(`${backendUrl}/admin/product-tags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) throw new Error()
      const body = await res.json()
      const tag: Tag = body.product_tag
      if (!tag?.id) throw new Error()
      setAllTags((prev) =>
        [...prev, tag].sort((a, b) => a.value.localeCompare(b.value)),
      )
      setSelected((prev) => new Set(prev).add(tag.id))
      setNewTag("")
      toast.success(`Created "${value}"`)
    } catch {
      toast.error("Failed to create tag")
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setSelected(new Set(savedIds))
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Tags</Heading>
        <Text size="small" className="text-ui-fg-muted">
          {selected.size} selected
        </Text>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Click a tag to toggle it. Scroll or filter to find what you need.
        </Text>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter tags..."
          disabled={loading || saving}
        />
        {loading ? (
          <Text size="small" className="text-ui-fg-muted">
            Loading tags…
          </Text>
        ) : filtered.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted">
            No tags match.
          </Text>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Text
                size="xsmall"
                className="text-ui-fg-muted uppercase tracking-wider"
              >
                Main Categories
              </Text>
              <div className="flex flex-wrap gap-2 border border-ui-border-base rounded-md p-3">
                {mainTags.length === 0 ? (
                  <Text size="small" className="text-ui-fg-muted">
                    No main category tags match your filter.
                  </Text>
                ) : (
                  mainTags.map((tag) => {
                    const active = selected.has(tag.id)
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={active ? "primary" : "secondary"}
                        size="small"
                        onClick={() => toggle(tag.id)}
                        disabled={saving}
                      >
                        {tag.value}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Text
                size="xsmall"
                className="text-ui-fg-muted uppercase tracking-wider"
              >
                Other Tags ({otherTags.length})
              </Text>
              <div
                className="flex flex-wrap gap-2 overflow-y-auto border border-ui-border-base rounded-md p-3"
                style={{ maxHeight: 320 }}
              >
                {otherTags.length === 0 ? (
                  <Text size="small" className="text-ui-fg-muted">
                    No other tags match your filter.
                  </Text>
                ) : (
                  otherTags.map((tag) => {
                    const active = selected.has(tag.id)
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={active ? "primary" : "secondary"}
                        size="small"
                        onClick={() => toggle(tag.id)}
                        disabled={saving}
                      >
                        {tag.value}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
        <div className="flex flex-col gap-2">
          <Text size="small" className="text-ui-fg-subtle">
            Create new tag
          </Text>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. beginner-friendly"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  createTag()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={createTag}
              disabled={saving || !newTag.trim()}
            >
              Add
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={!dirty || saving}
            onClick={reset}
          >
            Reset
          </Button>
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

export default ProductTagsWidget
