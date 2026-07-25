// Pure model behind the consolidated "Filters" panel on listing pages.
//
// Every option keeps its EXISTING destination: the same subcategory pages
// (/fish/reef-safe, /corals/lps, …) and the same query URLs (/store?category=…)
// the scattered chips pointed at before, so URLs, SEO pages, and filtering
// rules are unchanged — only the controls moved into one panel.

import { FISH_SUBCATEGORIES } from "@/lib/fishCategories";
import { CORALS_SUBCATEGORIES } from "@/lib/coralsCategories";
import { SUPPLIES_SUBCATEGORIES } from "@/lib/suppliesCategories";
import { sortByName } from "@/lib/alphaSort";

export type FilterOption = {
  label: string;
  value: string; // stable identity (subcategory handle or query value)
  href: string; // the SAME destination the old chip linked to
};

export type FilterGroup = {
  title: string;
  options: FilterOption[];
};

export type FiltersConfig = {
  groups: FilterGroup[];
  clearHref: string; // "All" — the unfiltered page
  clearLabel: string;
};

// Number shown on the button: "Filters (1)" when a selection is active.
// These pages are single-selection (one subcategory / one category tab).
export function activeFilterCount(activeValue: string | null | undefined): number {
  return activeValue ? 1 : 0;
}

export function findActiveOption(
  config: FiltersConfig,
  activeValue: string | null | undefined
): FilterOption | null {
  if (!activeValue) return null;
  for (const g of config.groups) {
    const hit = g.options.find((o) => o.value === activeValue);
    if (hit) return hit;
  }
  return null;
}

// Where "Apply Filters" goes: the chosen option's page, or Clear when nothing
// is chosen. Staged-but-unapplied choices never touch the URL.
export function resolveApplyHref(
  config: FiltersConfig,
  pendingValue: string | null
): string {
  return findActiveOption(config, pendingValue)?.href ?? config.clearHref;
}

// ---- page configs (options alphabetized A→Z within each group) ----

export function fishFiltersConfig(): FiltersConfig {
  const care = FISH_SUBCATEGORIES.filter((c) => c.group === "care");
  const species = FISH_SUBCATEGORIES.filter((c) => c.group === "species");
  const opt = (c: { handle: string; label: string }) => ({
    label: c.label,
    value: c.handle,
    href: `/fish/${c.handle}`,
  });
  return {
    clearHref: "/fish",
    clearLabel: "All Fish",
    groups: [
      { title: "By Care", options: sortByName(care.map(opt), (o) => o.label) },
      { title: "By Species", options: sortByName(species.map(opt), (o) => o.label) },
    ],
  };
}

export function coralsFiltersConfig(): FiltersConfig {
  const opt = (c: { handle: string; label: string }) => ({
    label: c.label,
    value: c.handle,
    href: `/corals/${c.handle}`,
  });
  return {
    clearHref: "/corals",
    clearLabel: "All Corals",
    groups: [
      {
        title: "Coral Type",
        options: sortByName(CORALS_SUBCATEGORIES.map(opt), (o) => o.label),
      },
    ],
  };
}

export function suppliesFiltersConfig(): FiltersConfig {
  const opt = (c: { handle: string; label: string }) => ({
    label: c.label,
    value: c.handle,
    href: `/supplies/${c.handle}`,
  });
  return {
    clearHref: "/supplies",
    clearLabel: "All Supplies",
    groups: [
      {
        title: "Supply Type",
        options: sortByName(SUPPLIES_SUBCATEGORIES.map(opt), (o) => o.label),
      },
    ],
  };
}

export function storeFiltersConfig(): FiltersConfig {
  const options: FilterOption[] = [
    { label: "New Arrivals", value: "new-arrivals" },
    { label: "Saltwater Fish", value: "fish" },
    { label: "Invertebrates", value: "inverts" },
    { label: "WYSIWYG Corals", value: "corals" },
    { label: "Supplies", value: "supplies" },
  ].map((o) => ({ ...o, href: `/store?category=${o.value}` }));
  return {
    clearHref: "/store",
    clearLabel: "All Products",
    groups: [
      { title: "Category", options: sortByName(options, (o) => o.label) },
    ],
  };
}
