import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  GroupableTag,
  UNCATEGORIZED,
  buildTagGroupMetadata,
  getSortPosition,
  groupTagsForDisplay,
  orderedGroups,
  planGroupOrder,
  resolveTagGroup,
} from "../../lib/tag-groups"

declare const __BACKEND_URL__: string | undefined

const NEW_GROUP = "__new__"

// Tag manager: create tags straight into a group (or a brand-new group),
// filter the list by group, and move/reorder tags later. Group + position are
// saved ON the tag (metadata.tag_group / metadata.sort_position), so tags
// created from any surface — admin, app, API, imports — join the same system;
// anything created without a group appears under "Uncategorized".
const TagsPage = () => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [tags, setTags] = useState<GroupableTag[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Creation form
  const [newName, setNewName] = useState("")
  const [newGroup, setNewGroup] = useState<string>(UNCATEGORIZED)
  const [newGroupName, setNewGroupName] = useState("")
  const [newPosition, setNewPosition] = useState("") // blank = end of group

  // List filter
  const [groupFilter, setGroupFilter] = useState<string>("__all__")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const pageSize = 200
      const all: GroupableTag[] = []
      let offset = 0
      for (;;) {
        const res = await fetch(
          `${backendUrl}/admin/product-tags?limit=${pageSize}&offset=${offset}&fields=id,value,metadata`,
          { credentials: "include" },
        )
        if (!res.ok) throw new Error()
        const body = await res.json()
        const page: GroupableTag[] = body.product_tags ?? []
        all.push(...page)
        if (page.length < pageSize) break
        offset += page.length
        if (offset > 10000) break
      }
      setTags(all)
    } catch {
      toast.error("Failed to load tags")
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => groupTagsForDisplay(tags), [tags])
  const groups = useMemo(() => orderedGroups(tags), [tags])

  const updateTag = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      const res = await fetch(`${backendUrl}/admin/product-tags/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`update failed for ${id}`)
    },
    [backendUrl],
  )

  // Writes explicit positions for a whole group in its current display order,
  // with `insert` placed at `atIndex` (end by default). Only this group's tags
  // are touched — other groups and Uncategorized keep their positions.
  const renumberGroup = useCallback(
    async (
      group: string,
      insertId: string,
      atIndex?: number,
      extraForInsert?: Record<string, unknown>,
    ) => {
      const section = groupTagsForDisplay(tags).find((s) => s.group === group)
      const current = (section?.tags ?? []).map((t) => ({ id: t.id }))
      const plan = planGroupOrder(current, { id: insertId, atIndex })
      for (const step of plan) {
        const isInsert = step.id === insertId
        const tag = tags.find((t) => t.id === step.id)
        await updateTag(step.id, {
          metadata: {
            ...(tag?.metadata ?? {}),
            ...buildTagGroupMetadata(group, step.sort_position),
            ...(isInsert ? (extraForInsert ?? {}) : {}),
          },
        })
      }
    },
    [tags, updateTag],
  )

  const createTag = async () => {
    const value = newName.trim()
    if (!value) return
    if (tags.some((t) => t.value.toLowerCase() === value.toLowerCase())) {
      toast.error(`A tag named "${value}" already exists`)
      return
    }
    const group =
      newGroup === NEW_GROUP ? newGroupName.trim() : newGroup
    if (newGroup === NEW_GROUP && !group) {
      toast.error("Name the new tag group first")
      return
    }
    setBusy(true)
    try {
      // Create with the group saved on the tag immediately.
      const posInput = newPosition.trim() === "" ? null : Number(newPosition)
      const res = await fetch(`${backendUrl}/admin/product-tags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value,
          metadata: buildTagGroupMetadata(
            group,
            posInput != null && Number.isFinite(posInput) ? posInput : null,
          ),
        }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()).product_tag as GroupableTag
      if (!created?.id) throw new Error()

      // No explicit position → place at the END of the chosen group by
      // renumbering that group (captures its current visible order first).
      if (
        group &&
        group !== UNCATEGORIZED &&
        (posInput == null || !Number.isFinite(posInput))
      ) {
        await renumberGroup(group, created.id)
      }
      toast.success(
        group && group !== UNCATEGORIZED
          ? `Created "${value}" in ${group}`
          : `Created "${value}" (Uncategorized)`,
      )
      setNewName("")
      setNewGroupName("")
      setNewPosition("")
      if (newGroup === NEW_GROUP) setNewGroup(group)
      await load()
    } catch {
      toast.error("Failed to create tag")
      await load()
    } finally {
      setBusy(false)
    }
  }

  const moveToGroup = async (tag: GroupableTag, target: string) => {
    setBusy(true)
    try {
      if (target === UNCATEGORIZED) {
        await updateTag(tag.id, {
          metadata: {
            ...(tag.metadata ?? {}),
            ...buildTagGroupMetadata(null, null),
          },
        })
      } else {
        // Lands at the end of the target group.
        await renumberGroup(target, tag.id)
      }
      toast.success(`Moved "${tag.value}" to ${target}`)
      await load()
    } catch {
      toast.error("Move failed")
      await load()
    } finally {
      setBusy(false)
    }
  }

  const nudge = async (group: string, tag: GroupableTag, dir: -1 | 1) => {
    const section = grouped.find((s) => s.group === group)
    if (!section) return
    const idx = section.tags.findIndex((t) => t.id === tag.id)
    const target = idx + dir
    if (idx === -1 || target < 0 || target >= section.tags.length) return
    setBusy(true)
    try {
      await renumberGroup(group, tag.id, target)
      await load()
    } catch {
      toast.error("Reorder failed")
      await load()
    } finally {
      setBusy(false)
    }
  }

  const visibleSections =
    groupFilter === "__all__"
      ? grouped
      : grouped.filter((s) => s.group === groupFilter)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Product Tags</Heading>
        <Text size="small" className="text-ui-fg-muted">
          {tags.length} tags · {groups.length} groups
        </Text>
      </div>

      {/* Create — group is assigned right here, at creation time */}
      <div className="flex flex-col gap-3 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Create a tag straight into a group. Pick “+ New group…” to start a
          new group in the same step. Leave the position blank to add it at the
          end of the group.
        </Text>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-1 flex-col gap-1">
            <Text size="xsmall" className="text-ui-fg-muted">
              Tag name
            </Text>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Torch Coral"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  createTag()
                }
              }}
            />
          </div>
          <div className="flex w-56 flex-col gap-1">
            <Text size="xsmall" className="text-ui-fg-muted">
              Tag group
            </Text>
            <Select
              value={newGroup}
              onValueChange={setNewGroup}
              disabled={busy}
            >
              <Select.Trigger>
                <Select.Value placeholder="Choose a group" />
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
                <Select.Item value={NEW_GROUP}>+ New group…</Select.Item>
              </Select.Content>
            </Select>
          </div>
          {newGroup === NEW_GROUP && (
            <div className="flex w-48 flex-col gap-1">
              <Text size="xsmall" className="text-ui-fg-muted">
                New group name
              </Text>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Inverts"
                disabled={busy}
              />
            </div>
          )}
          <div className="flex w-32 flex-col gap-1">
            <Text size="xsmall" className="text-ui-fg-muted">
              Sort position
            </Text>
            <Input
              value={newPosition}
              onChange={(e) =>
                setNewPosition(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="auto (end)"
              disabled={busy}
            />
          </div>
          <Button
            variant="primary"
            disabled={busy || !newName.trim()}
            isLoading={busy}
            onClick={createTag}
          >
            Create tag
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <Text size="xsmall" className="text-ui-fg-muted">
          Filter by group
        </Text>
        <div className="w-64">
          <Select
            value={groupFilter}
            onValueChange={setGroupFilter}
            disabled={loading}
          >
            <Select.Trigger>
              <Select.Value placeholder="All groups" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="__all__">All groups</Select.Item>
              {groups.map((g) => (
                <Select.Item key={g} value={g}>
                  {g}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {/* Grouped, ordered list */}
      <div className="flex flex-col gap-5 px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-muted">
            Loading tags…
          </Text>
        ) : (
          visibleSections.map(({ group, tags: sectionTags }) => (
            <div key={group} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Text
                  size="xsmall"
                  className="text-ui-fg-muted uppercase tracking-wider"
                >
                  {group}
                </Text>
                <Badge size="2xsmall">{sectionTags.length}</Badge>
                {group === UNCATEGORIZED && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    — tags created without a group land here
                  </Text>
                )}
              </div>
              <div className="flex flex-col divide-y rounded-md border border-ui-border-base">
                {sectionTags.length === 0 ? (
                  <Text size="small" className="text-ui-fg-muted p-3">
                    No tags in this group.
                  </Text>
                ) : (
                  sectionTags.map((tag, i) => (
                    <div
                      key={tag.id}
                      className="flex flex-wrap items-center gap-2 px-3 py-2"
                    >
                      <Text size="small" className="min-w-40 flex-1">
                        {tag.value}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted w-16">
                        {getSortPosition(tag) != null
                          ? `#${getSortPosition(tag)}`
                          : "auto"}
                      </Text>
                      <Button
                        type="button"
                        variant="transparent"
                        size="small"
                        disabled={busy || i === 0}
                        onClick={() => nudge(group, tag, -1)}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="transparent"
                        size="small"
                        disabled={busy || i === sectionTags.length - 1}
                        onClick={() => nudge(group, tag, 1)}
                        title="Move down"
                      >
                        ↓
                      </Button>
                      <div className="w-48">
                        <Select
                          value={resolveTagGroup(tag)}
                          onValueChange={(g) => moveToGroup(tag, g)}
                          disabled={busy}
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {groups.map((g) => (
                              <Select.Item key={g} value={g}>
                                {g}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Product Tags",
})

export default TagsPage
