import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Checkbox,
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
  MovePlan,
  UNCATEGORIZED,
  buildTagGroupMetadata,
  getSortPosition,
  groupTagsForDisplay,
  orderedGroups,
  planGroupOrder,
  planMoveToGroup,
  resolveTagGroup,
} from "../../lib/tag-groups"

declare const __BACKEND_URL__: string | undefined

const NEW_GROUP = "__new__"

// Tag manager: create tags straight into a group, and MOVE existing tags —
// individually or in bulk — between groups (or out of Uncategorized), with a
// new group creatable during the move. Group + position live ON the tag
// (metadata.tag_group / metadata.sort_position): moving is a metadata-only
// update, so the tag's id, name, handle, product assignments, and SEO
// behavior are untouched, and no duplicate tag is ever created.
const TagsPage = () => {
  const backendUrl = __BACKEND_URL__ ?? ""
  const [tags, setTags] = useState<GroupableTag[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Creation form
  const [newName, setNewName] = useState("")
  const [newGroup, setNewGroup] = useState<string>(UNCATEGORIZED)
  const [newGroupName, setNewGroupName] = useState("")
  const [newPosition, setNewPosition] = useState("")

  // List filter
  const [groupFilter, setGroupFilter] = useState<string>("__all__")

  // Bulk selection + move controls
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState<string>("")
  const [bulkNewGroup, setBulkNewGroup] = useState("")
  const [bulkPosition, setBulkPosition] = useState("")

  // Per-row position editor
  const [posEdit, setPosEdit] = useState<{ id: string; value: string } | null>(null)

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
      setSelected((prev) => {
        const ids = new Set(all.map((t) => t.id))
        return new Set([...prev].filter((id) => ids.has(id)))
      })
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

  // Runs a move plan: metadata-only updates, moved tags first. On any failure
  // it stops, reports, and reloads — a tag whose own update never ran is
  // completely untouched.
  const applyPlan = useCallback(
    async (plan: MovePlan): Promise<number> => {
      let done = 0
      for (const u of plan.updates) {
        await updateTag(u.id, { metadata: u.metadata })
        done++
      }
      return done
    },
    [updateTag],
  )

  const moveTags = useCallback(
    async (
      ids: string[],
      target: string | null,
      position: number | null,
      label?: string,
    ) => {
      const plan = planMoveToGroup(tags, ids, target, { position })
      if (plan.updates.length === 0) {
        toast.success(
          plan.noops.length === 1
            ? "Already in that group — nothing to change"
            : `Already in that group — nothing to change (${plan.noops.length} tags)`,
        )
        return
      }
      setBusy(true)
      try {
        await applyPlan(plan)
        const dest = plan.targetGroup ?? UNCATEGORIZED
        const movedCount = ids.length - plan.noops.length
        toast.success(
          label ??
            (movedCount === 1
              ? `Moved 1 tag to ${dest}`
              : `Moved ${movedCount} tags to ${dest}`) +
              (plan.noops.length ? ` (${plan.noops.length} already there)` : ""),
        )
        setSelected(new Set())
        setBulkTarget("")
        setBulkNewGroup("")
        setBulkPosition("")
      } catch {
        toast.error("Move failed — no further tags were changed; list refreshed")
      } finally {
        setBusy(false)
        await load()
      }
    },
    [tags, applyPlan, load],
  )

  const bulkMove = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    const target =
      bulkTarget === NEW_GROUP ? bulkNewGroup.trim() : bulkTarget
    if (!target) {
      toast.error(
        bulkTarget === NEW_GROUP
          ? "Name the new tag group first"
          : "Pick a destination group first",
      )
      return
    }
    const pos = bulkPosition.trim() === "" ? null : Number(bulkPosition)
    await moveTags(
      ids,
      target === UNCATEGORIZED ? null : target,
      pos != null && Number.isFinite(pos) ? pos : null,
    )
  }

  const savePosition = async (tag: GroupableTag) => {
    if (!posEdit || posEdit.id !== tag.id) return
    const v = Number(posEdit.value)
    setPosEdit(null)
    if (!Number.isFinite(v)) return
    const group = resolveTagGroup(tag)
    if (group === UNCATEGORIZED) {
      // Uncategorized has no curated order — position applies once grouped.
      toast.error("Pick a group first — positions apply inside a group")
      return
    }
    await moveTags([tag.id], group, v, `Position updated in ${group}`)
  }

  const createTag = async () => {
    const value = newName.trim()
    if (!value) return
    if (tags.some((t) => t.value.toLowerCase() === value.toLowerCase())) {
      toast.error(`A tag named "${value}" already exists`)
      return
    }
    const group = newGroup === NEW_GROUP ? newGroupName.trim() : newGroup
    if (newGroup === NEW_GROUP && !group) {
      toast.error("Name the new tag group first")
      return
    }
    setBusy(true)
    try {
      const posInput = newPosition.trim() === "" ? null : Number(newPosition)
      const res = await fetch(`${backendUrl}/admin/product-tags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value,
          metadata: buildTagGroupMetadata(group, null),
        }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()).product_tag as GroupableTag
      if (!created?.id) throw new Error()

      if (group && group !== UNCATEGORIZED) {
        // Place at the end of the group (or at the requested position) by
        // planning against the catalog INCLUDING the newborn tag.
        const plan = planMoveToGroup([...tags, created], [created.id], group, {
          position:
            posInput != null && Number.isFinite(posInput) ? posInput : null,
        })
        await applyPlan(plan)
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
    } catch {
      toast.error("Failed to create tag")
    } finally {
      setBusy(false)
      await load()
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
      const plan = planGroupOrder(
        section.tags.map((t) => ({ id: t.id })),
        { id: tag.id, atIndex: target },
      )
      for (const step of plan) {
        const existing = tags.find((t) => t.id === step.id)
        await updateTag(step.id, {
          metadata: {
            ...(existing?.metadata ?? {}),
            ...buildTagGroupMetadata(group, step.sort_position),
          },
        })
      }
    } catch {
      toast.error("Reorder failed")
    } finally {
      setBusy(false)
      await load()
    }
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
            <Select value={newGroup} onValueChange={setNewGroup} disabled={busy}>
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

      {/* Filter + bulk move */}
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
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

        {selected.size > 0 && (
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-ui-border-base p-3">
            <Text size="small" className="font-medium">
              {selected.size} selected
            </Text>
            <div className="flex w-56 flex-col gap-1">
              <Text size="xsmall" className="text-ui-fg-muted">
                Move to group
              </Text>
              <Select
                value={bulkTarget}
                onValueChange={setBulkTarget}
                disabled={busy}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Choose destination" />
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
            {bulkTarget === NEW_GROUP && (
              <div className="flex w-48 flex-col gap-1">
                <Text size="xsmall" className="text-ui-fg-muted">
                  New group name
                </Text>
                <Input
                  value={bulkNewGroup}
                  onChange={(e) => setBulkNewGroup(e.target.value)}
                  placeholder="e.g. Inverts"
                  disabled={busy}
                />
              </div>
            )}
            <div className="flex w-32 flex-col gap-1">
              <Text size="xsmall" className="text-ui-fg-muted">
                Position
              </Text>
              <Input
                value={bulkPosition}
                onChange={(e) =>
                  setBulkPosition(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="auto (end)"
                disabled={busy}
              />
            </div>
            <Button
              variant="primary"
              size="small"
              disabled={busy || !bulkTarget}
              isLoading={busy}
              onClick={bulkMove}
            >
              Move selected
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={busy}
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
        )}
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
                    — select tags here and use “Move selected” (or the row’s
                    group menu) to file them
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
                      <Checkbox
                        checked={selected.has(tag.id)}
                        onCheckedChange={() => toggleSelected(tag.id)}
                        disabled={busy}
                        aria-label={`Select ${tag.value}`}
                      />
                      <Text size="small" className="min-w-40 flex-1">
                        {tag.value}
                      </Text>
                      {posEdit?.id === tag.id ? (
                        <Input
                          autoFocus
                          className="w-20"
                          value={posEdit.value}
                          onChange={(e) =>
                            setPosEdit({
                              id: tag.id,
                              value: e.target.value.replace(/[^0-9]/g, ""),
                            })
                          }
                          onBlur={() => savePosition(tag)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePosition(tag)
                            if (e.key === "Escape") setPosEdit(null)
                          }}
                          disabled={busy}
                        />
                      ) : (
                        <button
                          type="button"
                          className="w-16 text-left text-xs text-ui-fg-muted hover:text-ui-fg-base"
                          title="Click to set the sort position"
                          onClick={() =>
                            setPosEdit({
                              id: tag.id,
                              value: String(getSortPosition(tag) ?? ""),
                            })
                          }
                          disabled={busy}
                        >
                          {getSortPosition(tag) != null
                            ? `#${getSortPosition(tag)}`
                            : "auto"}
                        </button>
                      )}
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
                          onValueChange={(g) => {
                            if (g === NEW_GROUP) {
                              // Create-a-group-while-moving: select the tag
                              // and finish in the bulk bar's new-group form.
                              setSelected(new Set([tag.id]))
                              setBulkTarget(NEW_GROUP)
                              toast.success(
                                `Name the new group above to move "${tag.value}" into it`,
                              )
                              return
                            }
                            moveTags(
                              [tag.id],
                              g === UNCATEGORIZED ? null : g,
                              null,
                            )
                          }}
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
                            <Select.Item value={NEW_GROUP}>
                              + New group…
                            </Select.Item>
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
