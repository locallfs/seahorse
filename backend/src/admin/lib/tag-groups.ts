// ---------------------------------------------------------------------------
// Product tag grouping — single source of truth.
//
// A tag's group and position live IN THE TAG ITSELF as stable metadata:
//   metadata.tag_group     → group name (string). Absent/blank = Uncategorized.
//   metadata.sort_position → number. Absent = legacy ordering (below).
//
// This makes grouping work identically for every creation surface: the admin
// tags page, the product-page widget, the ReefNerds app, the API, imports,
// and backend code — a tag created anywhere with no metadata simply appears
// under "Uncategorized" (never hidden, never mixed into another group).
//
// LEGACY PRESERVATION: before metadata existed, groups were hardcoded name
// lists (Main Categories / Fish / Coral / Supplies) sorted alphabetically
// (Main in a fixed order). Tags without metadata still resolve through those
// lists, so every current assignment and position is preserved exactly.
// ---------------------------------------------------------------------------

export const UNCATEGORIZED = "Uncategorized"

export const GROUP_MAIN = "Main Categories"
export const GROUP_FISH = "Fish"
export const GROUP_CORAL = "Coral"
export const GROUP_SUPPLIES = "Supplies"

// Fixed display order for the long-standing groups; custom groups follow
// alphabetically; Uncategorized is ALWAYS last.
const LEGACY_GROUP_ORDER = [GROUP_MAIN, GROUP_FISH, GROUP_CORAL, GROUP_SUPPLIES]

export const MAIN_TAG_NAMES = [
  "Fish",
  "Corals",
  "Inverts",
  "New Arrivals",
  "Supplies",
  "WYSIWYG Fish",
  "WYSIWYG Corals",
]

const FISH_TAG_NAMES = [
  // Care
  "Reef Safe",
  "With Caution",
  "Aggressive",
  // Species
  "Clownfish",
  "Tangs",
  "Angelfish",
  "Wrasses",
  "Gobies",
  "Blennies",
  "Basslets & Grammas",
  "Dottybacks",
  "Cardinalfish",
  "Damselfish & Chromis",
  "Hawkfish",
  "Butterflyfish",
  "Triggerfish",
  "Pufferfish",
  "Lionfish & Scorpionfish",
  "Eels",
  "Rabbitfish & Foxfaces",
  "Anthias",
  "Seahorses & Pipefish",
  "Dragonets",
  "Filefish",
]

const CORAL_TAG_NAMES = [
  "Soft",
  "LPS",
  "SPS",
  "Zoanthids",
  "Mushrooms",
  "Gorgonians",
  "NPS",
  "Macro",
  "Macroalgae",
  "Acanthophyllia",
  "Acropora",
  "Alveopora",
  "Birdsnest",
  "Chalice",
  "Clove Polyp",
  "Colony",
  "Coral",
  "Cyphastrea",
  "Digitata",
  "Duncan",
  "Encrusters",
  "Euphyllia",
  "Frag Pack",
  "Frag Rack",
  "Galaxea",
  "Goniopora",
  "Grafted",
  "Hammer",
  "Large Frag",
  "Leather",
  "Leptoseris",
  "Montipora",
  "Pectinia",
  "Pipe Organ",
  "Plate Coral",
  "Pocillopora",
  "Scolymia",
  "Signature Coral",
  "Stylophora",
  "Torch",
  "Trachyphyllia",
  "Xenia",
  "XL Frag",
]

const SUPPLIES_TAG_NAMES = [
  "Sea Salt",
  "Chemicals",
  "Test Kits",
  "Lighting",
  "Pumps",
  "Filtration",
  "Food",
  "Plumbing",
  "Maintenance",
]

const MAIN_TAG_SET = new Set(MAIN_TAG_NAMES.map((n) => n.toLowerCase()))
const FISH_TAG_SET = new Set(FISH_TAG_NAMES.map((n) => n.toLowerCase()))
const CORAL_TAG_SET = new Set(CORAL_TAG_NAMES.map((n) => n.toLowerCase()))
const SUPPLIES_TAG_SET = new Set(SUPPLIES_TAG_NAMES.map((n) => n.toLowerCase()))

const mainOrder = (v: string) => {
  const i = MAIN_TAG_NAMES.findIndex((n) => n.toLowerCase() === v.toLowerCase())
  return i === -1 ? MAIN_TAG_NAMES.length : i
}

export type GroupableTag = {
  id: string
  value: string
  metadata?: Record<string, unknown> | null
}

// Group a tag belongs to: explicit metadata first, then the legacy name
// lists, otherwise Uncategorized. Uncategorized tags are NEVER folded into
// another group.
export function resolveTagGroup(tag: GroupableTag): string {
  const explicit = tag.metadata?.tag_group
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim()
  const v = tag.value.toLowerCase()
  if (MAIN_TAG_SET.has(v)) return GROUP_MAIN
  if (FISH_TAG_SET.has(v)) return GROUP_FISH
  if (CORAL_TAG_SET.has(v)) return GROUP_CORAL
  if (SUPPLIES_TAG_SET.has(v)) return GROUP_SUPPLIES
  return UNCATEGORIZED
}

export function getSortPosition(tag: GroupableTag): number | null {
  const raw = tag.metadata?.sort_position
  const n = typeof raw === "string" ? Number(raw) : (raw as number)
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

// Order INSIDE one group: explicitly positioned tags first (ascending), then
// legacy ordering for the rest (Main's fixed order, alphabetical elsewhere).
// A group nobody has reordered has no positions at all, so today's display
// is preserved verbatim.
export function sortTagsInGroup(tags: GroupableTag[], group: string): GroupableTag[] {
  const legacy = (a: GroupableTag, b: GroupableTag) =>
    group === GROUP_MAIN
      ? mainOrder(a.value) - mainOrder(b.value) || a.value.localeCompare(b.value)
      : a.value.localeCompare(b.value)
  return [...tags].sort((a, b) => {
    const pa = getSortPosition(a)
    const pb = getSortPosition(b)
    if (pa != null && pb != null) return pa - pb || legacy(a, b)
    if (pa != null) return -1
    if (pb != null) return 1
    return legacy(a, b)
  })
}

// Every group present, in display order: legacy groups first (fixed order),
// then custom groups alphabetically, Uncategorized always last — and always
// shown, so ungrouped tags are never hidden.
export function orderedGroups(tags: GroupableTag[]): string[] {
  const present = new Set(tags.map(resolveTagGroup))
  const legacy = LEGACY_GROUP_ORDER.filter((g) => present.has(g))
  const custom = [...present]
    .filter((g) => !LEGACY_GROUP_ORDER.includes(g) && g !== UNCATEGORIZED)
    .sort((a, b) => a.localeCompare(b))
  return [...legacy, ...custom, UNCATEGORIZED]
}

// Full grouped + ordered display model.
export function groupTagsForDisplay(
  tags: GroupableTag[]
): Array<{ group: string; tags: GroupableTag[] }> {
  const byGroup = new Map<string, GroupableTag[]>()
  for (const t of tags) {
    const g = resolveTagGroup(t)
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(t)
  }
  return orderedGroups(tags).map((group) => ({
    group,
    tags: sortTagsInGroup(byGroup.get(group) ?? [], group),
  }))
}

// Metadata to save on a tag for a chosen group/position. Choosing
// "Uncategorized" (or no group) stores NO group — absence IS Uncategorized,
// so ungrouped tags stay visible there instead of being discarded.
export function buildTagGroupMetadata(
  group: string | null | undefined,
  sortPosition: number | null | undefined
): Record<string, unknown> {
  const g = (group ?? "").trim()
  return {
    tag_group: g && g !== UNCATEGORIZED ? g : null,
    sort_position:
      typeof sortPosition === "number" && Number.isFinite(sortPosition)
        ? sortPosition
        : null,
  }
}

const STEP = 10

// Renumber a group (in its current display order) and insert one tag at
// `atIndex` (clamped; end by default). Returns the per-tag positions to save —
// spaced by 10 so single moves stay cheap. Used for create-at-end, move-to-
// group, and reorder. Tags in OTHER groups are never touched.
export function planGroupOrder(
  groupTagsInDisplayOrder: Array<{ id: string }>,
  insert: { id: string; atIndex?: number }
): Array<{ id: string; sort_position: number }> {
  const rest = groupTagsInDisplayOrder.filter((t) => t.id !== insert.id)
  const at = Math.max(0, Math.min(insert.atIndex ?? rest.length, rest.length))
  const order = [...rest.slice(0, at), { id: insert.id }, ...rest.slice(at)]
  return order.map((t, i) => ({ id: t.id, sort_position: (i + 1) * STEP }))
}
