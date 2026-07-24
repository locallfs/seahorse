import { describe, it, expect } from "vitest"
import {
  GROUP_CORAL,
  GROUP_FISH,
  GROUP_MAIN,
  UNCATEGORIZED,
  buildTagGroupMetadata,
  getSortPosition,
  groupTagsForDisplay,
  orderedGroups,
  planGroupOrder,
  resolveTagGroup,
  sortTagsInGroup,
} from "../tag-groups"

const t = (
  id: string,
  value: string,
  metadata?: Record<string, unknown> | null
) => ({ id, value, metadata })

describe("assigning a group at creation", () => {
  it("a new tag saved with an existing group resolves into that group", () => {
    const meta = buildTagGroupMetadata(GROUP_CORAL, null)
    expect(resolveTagGroup(t("x", "Rainbow Chalice", meta))).toBe(GROUP_CORAL)
  })
  it("a brand-new group created during tag creation works the same way", () => {
    const meta = buildTagGroupMetadata("Inverts", null)
    const tag = t("x", "Cleaner Shrimp", meta)
    expect(resolveTagGroup(tag)).toBe("Inverts")
    // ...and the new group appears in the group list (before Uncategorized)
    const groups = orderedGroups([tag])
    expect(groups).toContain("Inverts")
    expect(groups[groups.length - 1]).toBe(UNCATEGORIZED)
  })
  it("explicit metadata beats the legacy name lists", () => {
    const meta = buildTagGroupMetadata("My Group", 5)
    expect(resolveTagGroup(t("x", "Torch", meta))).toBe("My Group")
  })
  it("choosing Uncategorized (or no group) stores NO group", () => {
    expect(buildTagGroupMetadata(UNCATEGORIZED, null).tag_group).toBeNull()
    expect(buildTagGroupMetadata(null, null).tag_group).toBeNull()
    expect(buildTagGroupMetadata("  ", null).tag_group).toBeNull()
  })
})

describe("ungrouped tags land in Uncategorized — never hidden, never mixed in", () => {
  it("a tag with no metadata and no legacy match is Uncategorized", () => {
    expect(resolveTagGroup(t("x", "beginner-friendly"))).toBe(UNCATEGORIZED)
  })
  it("Uncategorized tags appear in their own section, not inside other groups", () => {
    const tags = [
      t("a", "Torch"), // legacy → Coral
      t("b", "beginner-friendly"), // → Uncategorized
      t("c", "Aardvark"), // alphabetically before Torch, but NOT a coral
    ]
    const sections = groupTagsForDisplay(tags)
    const coral = sections.find((s) => s.group === GROUP_CORAL)!
    const uncat = sections.find((s) => s.group === UNCATEGORIZED)!
    expect(coral.tags.map((x) => x.id)).toEqual(["a"])
    expect(uncat.tags.map((x) => x.id).sort()).toEqual(["b", "c"])
  })
  it("the Uncategorized section is always last and always present", () => {
    const sections = groupTagsForDisplay([t("a", "Torch")])
    expect(sections[sections.length - 1].group).toBe(UNCATEGORIZED)
  })
})

describe("legacy groups and ordering are preserved exactly", () => {
  it("legacy name lists still group metadata-less tags", () => {
    expect(resolveTagGroup(t("1", "Clownfish"))).toBe(GROUP_FISH)
    expect(resolveTagGroup(t("2", "Torch"))).toBe(GROUP_CORAL)
    expect(resolveTagGroup(t("3", "New Arrivals"))).toBe(GROUP_MAIN)
  })
  it("Main Categories keeps its fixed order (not alphabetical)", () => {
    const tags = [t("a", "Corals"), t("b", "Fish"), t("c", "New Arrivals")]
    const sorted = sortTagsInGroup(tags, GROUP_MAIN)
    expect(sorted.map((x) => x.value)).toEqual(["Fish", "Corals", "New Arrivals"])
  })
  it("groups without explicit positions keep alphabetical order", () => {
    const tags = [t("a", "Torch"), t("b", "Hammer"), t("c", "Acropora")]
    const sorted = sortTagsInGroup(tags, GROUP_CORAL)
    expect(sorted.map((x) => x.value)).toEqual(["Acropora", "Hammer", "Torch"])
  })
})

describe("tag ordering with explicit positions", () => {
  it("explicit sort positions are honored (and beat alphabetical)", () => {
    const tags = [
      t("a", "Zebra", { sort_position: 10 }),
      t("b", "Apple", { sort_position: 20 }),
    ]
    expect(sortTagsInGroup(tags, "G").map((x) => x.value)).toEqual([
      "Zebra",
      "Apple",
    ])
  })
  it("numeric-string positions count too; junk means no position", () => {
    expect(getSortPosition(t("a", "x", { sort_position: "30" }))).toBe(30)
    expect(getSortPosition(t("a", "x", { sort_position: "soon" }))).toBeNull()
    expect(getSortPosition(t("a", "x"))).toBeNull()
  })
  it("positioned tags come first; unpositioned follow in legacy order", () => {
    const tags = [
      t("a", "Alpha"),
      t("b", "Zulu", { sort_position: 1 }),
      t("c", "Mike"),
    ]
    expect(sortTagsInGroup(tags, "G").map((x) => x.value)).toEqual([
      "Zulu",
      "Alpha",
      "Mike",
    ])
  })
})

describe("planGroupOrder — create at end, move, reorder", () => {
  it("a new tag with no position is placed at the END of its group", () => {
    const plan = planGroupOrder([{ id: "a" }, { id: "b" }], { id: "new" })
    expect(plan).toEqual([
      { id: "a", sort_position: 10 },
      { id: "b", sort_position: 20 },
      { id: "new", sort_position: 30 },
    ])
  })
  it("inserting at an index reorders within the group only", () => {
    const plan = planGroupOrder([{ id: "a" }, { id: "b" }, { id: "c" }], {
      id: "c",
      atIndex: 0,
    })
    expect(plan.map((p) => p.id)).toEqual(["c", "a", "b"])
    expect(plan.map((p) => p.sort_position)).toEqual([10, 20, 30])
  })
  it("the plan positions round-trip through the sorter (order preserved)", () => {
    const plan = planGroupOrder([{ id: "a" }, { id: "b" }], { id: "n" })
    const tags = plan.map((p, i) =>
      t(p.id, `val${i}`, { sort_position: p.sort_position })
    )
    expect(sortTagsInGroup([...tags].reverse(), "G").map((x) => x.id)).toEqual([
      "a",
      "b",
      "n",
    ])
  })
  it("moving a tag to another group = appending to that group's plan", () => {
    // "moved" arrives at the end of the target group; source group untouched.
    const plan = planGroupOrder([{ id: "t1" }, { id: "t2" }], { id: "moved" })
    expect(plan[plan.length - 1]).toEqual({ id: "moved", sort_position: 30 })
    expect(plan.some((p) => p.id === "t1")).toBe(true)
  })
})
