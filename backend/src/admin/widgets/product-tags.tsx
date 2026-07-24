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
import { useEffect, useMemo, useState } from "react"
import {
  GroupableTag,
  UNCATEGORIZED,
  buildTagGroupMetadata,
  groupTagsForDisplay,
  orderedGroups,
  planGroupOrder,
} from "../lib/tag-groups"

declare const __BACKEND_URL__: string | undefined

// Product-page tag picker. Grouping/ordering comes from the shared tag-group
// system (metadata.tag_group / metadata.sort_position, with the legacy name
// lists as fallback) — the same one the Product Tags page manages. Tags
// without a group show under "Uncategorized"; they are never hidden and never
// mixed into other groups.
const ProductTagsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [allTags, setAllTags] = useState<GroupableTag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [newTag, setNewTag] = useState("")
  const [newTagGroup, setNewTagGroup] = useState<string>(UNCATEGORIZED)
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
        const all: GroupableTag[] = []
        let offset = 0
        while (!cancelled) {
          const res = await fetch(
            `${backendUrl}/admin/product-tags?limit=${pageSize}&offset=${offset}&fields=id,value,metadata`,
            { credentials: "include" },
          )
          if (!res.ok) break
          const body = await res.json()
          const page: GroupableTag[] = body.product_tags ?? []
          all.push(...page)
          if (page.length < pageSize) break
          offset += page.length
          if (offset > 10000) break
        }
        if (!cancelled) setAllTags(all)
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

  // Grouped + ordered exactly like the Product Tags page (shared logic).
  const sections = useMemo(() => groupTagsForDisplay(filtered), [filtered])
  const groups = useMemo(() => orderedGroups(allTags), [allTags])

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
      // The group is assigned AT CREATION (saved on the tag itself).
      const res = await fetch(`${backendUrl}/admin/product-tags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value,
          metadata: buildTagGroupMetadata(newTagGroup, null),
        }),
      })
      if (!res.ok) throw new Error()
      const body = await res.json()
      const tag: GroupableTag = body.product_tag
      if (!tag?.id) throw new Error()

      // Place it at the END of the chosen group (renumbers just that group,
      // preserving its current visible order).
      let placed: GroupableTag = tag
      if (newTagGroup !== UNCATEGORIZED) {
        const section = groupTagsForDisplay(allTags).find(
          (s) => s.group === newTagGroup,
        )
        const plan = planGroupOrder(
          (section?.tags ?? []).map((t) => ({ id: t.id })),
          { id: tag.id },
        )
        for (const step of plan) {
          const existing = allTags.find((t) => t.id === step.id)
          const meta = {
            ...((step.id === tag.id ? tag.metadata : existing?.metadata) ?? {}),
            ...buildTagGroupMetadata(newTagGroup, step.sort_position),
          }
          const ur = await fetch(
            `${backendUrl}/admin/product-tags/${step.id}`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ metadata: meta }),
            },
          )
          if (!ur.ok) throw new Error()
          if (step.id === tag.id) placed = { ...tag, metadata: meta }
          else if (existing) existing.metadata = meta
        }
      }
      setAllTags((prev) => [
        ...prev.filter((t) => t.id !== placed.id),
        placed,
      ])
      setSelected((prev) => new Set(prev).add(tag.id))
      setNewTag("")
      toast.success(
        newTagGroup !== UNCATEGORIZED
          ? `Created "${value}" in ${newTagGroup}`
          : `Created "${value}" (Uncategorized)`,
      )
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
          Groups and order are managed on the Product Tags page.
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
          sections.map(({ group, tags }) =>
            tags.length === 0 && query.trim() !== "" ? null : (
              <div key={group} className="flex flex-col gap-2">
                <Text
                  size="xsmall"
                  className="text-ui-fg-muted uppercase tracking-wider"
                >
                  {group} ({tags.length})
                </Text>
                <div
                  className="flex flex-wrap gap-2 overflow-y-auto border border-ui-border-base rounded-md p-3"
                  style={{ maxHeight: 240 }}
                >
                  {tags.length === 0 ? (
                    <Text size="small" className="text-ui-fg-muted">
                      No tags here yet.
                    </Text>
                  ) : (
                    tags.map((tag) => {
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
            ),
          )
        )}
        <div className="flex flex-col gap-2">
          <Text size="small" className="text-ui-fg-subtle">
            Create new tag — pick its group now (or leave Uncategorized)
          </Text>
          <div className="flex flex-wrap gap-2">
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
            <div className="w-48">
              <Select
                value={newTagGroup}
                onValueChange={setNewTagGroup}
                disabled={saving}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Tag group" />
                </Select.Trigger>
                <Select.Content>
                  {groups
                    .filter((g) => g !== UNCATEGORIZED)
                    .map((g) => (
                      <Select.Item key={g} value={g}>
                        {g}
                      </Select.Item>
                    ))}
                  <Select.Item value={UNCATEGORIZED}>
                    Uncategorized (no group)
                  </Select.Item>
                </Select.Content>
              </Select>
            </div>
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
