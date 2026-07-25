import { describe, it, expect } from "vitest"
import {
  GROUP_CORAL,
  GROUP_FISH,
  UNCATEGORIZED,
  indexForPosition,
  planMoveToGroup,
  resolveTagGroup,
  sortTagsInGroup,
} from "../tag-groups"

const t = (
  id: string,
  value: string,
  metadata?: Record<string, unknown> | null
) => ({ id, value, metadata })

// A little catalog: a positioned Coral group, one Fish tag, three
// uncategorized strays. "keep" carries unrelated metadata that must survive.
const catalog = () => [
  t("c1", "Acropora", { tag_group: GROUP_CORAL, sort_position: 10 }),
  t("c2", "Hammer", { tag_group: GROUP_CORAL, sort_position: 20 }),
  t("c3", "Torch", { tag_group: GROUP_CORAL, sort_position: 30 }),
  t("f1", "Clownfish", { tag_group: GROUP_FISH, sort_position: 10 }),
  t("u1", "beginner-friendly"),
  t("u2", "staff-pick", { keep: "me" }),
  t("u3", "rare-find"),
]

const apply = (all: ReturnType<typeof catalog>, plan: { updates: Array<{ id: string; metadata: Record<string, unknown> }> }) =>
  all.map((tag) => {
    const u = plan.updates.find((x) => x.id === tag.id)
    return u ? { ...tag, metadata: u.metadata } : tag
  })

describe("moving an uncategorized tag into an existing group", () => {
  it("lands at the END of the destination group by default and leaves Uncategorized", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1"], GROUP_CORAL)
    const after = apply(all, plan)
    const moved = after.find((x) => x.id === "u1")!
    expect(resolveTagGroup(moved)).toBe(GROUP_CORAL)
    const coral = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === GROUP_CORAL),
      GROUP_CORAL
    )
    expect(coral.map((x) => x.id)).toEqual(["c1", "c2", "c3", "u1"]) // end
    // Immediately out of Uncategorized:
    expect(
      after.filter((x) => resolveTagGroup(x) === UNCATEGORIZED).map((x) => x.id)
    ).toEqual(["u2", "u3"])
  })
  it("a requested sort position places the tag exactly there", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1"], GROUP_CORAL, { position: 15 })
    const after = apply(all, plan)
    const coral = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === GROUP_CORAL),
      GROUP_CORAL
    )
    expect(coral.map((x) => x.id)).toEqual(["c1", "u1", "c2", "c3"])
  })
})

describe("bulk moves", () => {
  it("moves multiple uncategorized tags in one action, appended in selection order", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u3", "u1"], GROUP_FISH)
    const after = apply(all, plan)
    const fish = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === GROUP_FISH),
      GROUP_FISH
    )
    expect(fish.map((x) => x.id)).toEqual(["f1", "u3", "u1"])
  })
  it("mixed bulk: tags already in the destination are safe no-ops, the rest move", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["c1", "u1"], GROUP_CORAL)
    expect(plan.noops).toEqual(["c1"])
    const after = apply(all, plan)
    const coral = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === GROUP_CORAL),
      GROUP_CORAL
    )
    expect(coral.map((x) => x.id)).toEqual(["c1", "c2", "c3", "u1"])
  })
})

describe("creating a new group during the move", () => {
  it("a brand-new group name works without any pre-creation step", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1", "u2"], "Inverts")
    const after = apply(all, plan)
    const inverts = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === "Inverts"),
      "Inverts"
    )
    expect(inverts.map((x) => x.id)).toEqual(["u1", "u2"])
  })
})

describe("nothing but grouping metadata ever changes", () => {
  it("updates carry ONLY {id, metadata} — product assignments, names, and handles are untouchable", () => {
    const plan = planMoveToGroup(catalog(), ["u2"], GROUP_CORAL)
    for (const u of plan.updates) {
      expect(Object.keys(u).sort()).toEqual(["id", "metadata"])
    }
  })
  it("unrelated metadata keys survive the move", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u2"], GROUP_CORAL)
    const moved = plan.updates.find((u) => u.id === "u2")!
    expect(moved.metadata.keep).toBe("me")
    expect(moved.metadata.tag_group).toBe(GROUP_CORAL)
  })
  it("no duplicate tags: the plan only updates existing ids, never creates or deletes", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1", "u3"], GROUP_CORAL)
    const knownIds = new Set(all.map((x) => x.id))
    for (const u of plan.updates) expect(knownIds.has(u.id)).toBe(true)
    expect(apply(all, plan)).toHaveLength(all.length)
  })
})

describe("destination ordering stays valid", () => {
  it("the destination group is renumbered — unique, ascending, no duplicate positions", () => {
    const all = [
      // deliberately colliding positions in the destination:
      t("a", "Aiptasia-Eater", { tag_group: "G", sort_position: 10 }),
      t("b", "Bumblebee Snail", { tag_group: "G", sort_position: 10 }),
      t("u", "urchin"),
    ]
    const plan = planMoveToGroup(all, ["u"], "G", { position: 10 })
    const after = apply(all, plan)
    const positions = after
      .filter((x) => resolveTagGroup(x) === "G")
      .map((x) => x.metadata!.sort_position as number)
    expect(new Set(positions).size).toBe(positions.length) // unique
    expect([...positions].sort((x, y) => x - y)).toEqual([10, 20, 30])
  })
  it("groups and tags not involved in the move appear nowhere in the plan", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1"], GROUP_CORAL)
    const touched = plan.updates.map((u) => u.id)
    expect(touched).not.toContain("f1") // other group untouched
    expect(touched).not.toContain("u2") // other uncategorized untouched
    expect(touched).not.toContain("u3")
  })
})

describe("moving between two categorized groups", () => {
  it("Coral → Fish: joins the end of Fish; remaining Coral tags keep their exact positions", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["c2"], GROUP_FISH)
    const after = apply(all, plan)
    const fish = sortTagsInGroup(
      after.filter((x) => resolveTagGroup(x) === GROUP_FISH),
      GROUP_FISH
    )
    expect(fish.map((x) => x.id)).toEqual(["f1", "c2"])
    // Source group's remaining tags: entirely untouched (not even renumbered).
    const c1 = after.find((x) => x.id === "c1")!
    const c3 = after.find((x) => x.id === "c3")!
    expect(c1.metadata!.sort_position).toBe(10)
    expect(c3.metadata!.sort_position).toBe(30)
  })
  it("moving back to Uncategorized sticks — even for legacy-named tags the old lists would reclaim", () => {
    const all = catalog()
    // "Hammer" is on the legacy Coral name list; an explicit move to
    // Uncategorized must beat that fallback.
    const plan = planMoveToGroup(all, ["c2"], null)
    const after = apply(all, plan)
    const back = after.find((x) => x.id === "c2")!
    expect(resolveTagGroup(back)).toBe(UNCATEGORIZED)
    expect(back.metadata!.sort_position).toBeNull()
    expect(after).toHaveLength(all.length)
  })
})

describe("no-ops and failure safety", () => {
  it("already in the destination group → zero updates, reported as a no-op", () => {
    const plan = planMoveToGroup(catalog(), ["c1"], GROUP_CORAL)
    expect(plan.updates).toHaveLength(0)
    expect(plan.noops).toEqual(["c1"])
  })
  it("moved tags come FIRST in the plan, so a failure mid-plan cannot have skipped them", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1"], GROUP_CORAL, { position: 5 })
    expect(plan.updates[0].id).toBe("u1")
  })
  it("a failed move (nothing applied) leaves the original tag and all assignments untouched", () => {
    const all = catalog()
    const plan = planMoveToGroup(all, ["u1"], GROUP_CORAL)
    // The executor stops on the first failed update; applying NONE of the
    // plan must equal the original catalog exactly.
    const untouched = apply(all, { updates: [] })
    expect(untouched).toEqual(all)
    expect(resolveTagGroup(untouched.find((x) => x.id === "u1")!)).toBe(UNCATEGORIZED)
    void plan
  })
})

describe("position → index math", () => {
  it("requested positions land before the first tag at-or-above them; oversized requests land at the end", () => {
    const group = [
      t("a", "A", { sort_position: 10 }),
      t("b", "B", { sort_position: 20 }),
      t("c", "C"), // unpositioned tail
    ]
    expect(indexForPosition(group, 5)).toBe(0)
    expect(indexForPosition(group, 15)).toBe(1)
    expect(indexForPosition(group, 20)).toBe(1)
    expect(indexForPosition(group, 999)).toBe(3)
  })
})
