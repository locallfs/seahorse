export type SuppliesSubcategory = {
  handle: string;
  label: string;
  tag: string;
  description: string;
  metaDescription: string;
};

export const SUPPLIES_SUBCATEGORIES: SuppliesSubcategory[] = [
  {
    handle: "chemicals",
    label: "Chemicals & Additives",
    tag: "Chemicals",
    description: "Salt mix, calcium, alkalinity, magnesium, trace elements.",
    metaDescription:
      "Reef chemicals and additives — salt mix, calcium, alkalinity, magnesium, trace elements from Seachem, Red Sea, and more.",
  },
  {
    handle: "test-kits",
    label: "Test Kits",
    tag: "Test Kits",
    description: "Water test kits, refractometers, and probes.",
    metaDescription:
      "Saltwater test kits, refractometers, and water-quality probes for accurate reef tank monitoring.",
  },
  {
    handle: "lighting",
    label: "Lighting",
    tag: "Lighting",
    description: "Reef LEDs, T5, and supplemental lighting.",
    metaDescription:
      "Reef aquarium lighting — AI Hydra, Aqua Illumination, T5, and supplemental fixtures for SPS, LPS, and softies.",
  },
  {
    handle: "pumps",
    label: "Pumps & Powerheads",
    tag: "Pumps",
    description: "Return pumps, powerheads, and circulation.",
    metaDescription:
      "Return pumps, powerheads, and circulation gear from Axis, Aquatop, and other reef-grade brands.",
  },
  {
    handle: "filtration",
    label: "Filtration",
    tag: "Filtration",
    description: "Protein skimmers, media reactors, and filter media.",
    metaDescription:
      "Reef filtration — protein skimmers, media reactors, GFO, carbon, and biological filtration media.",
  },
  {
    handle: "food",
    label: "Food & Feeders",
    tag: "Food",
    description: "Frozen, dry, and live food for fish and corals.",
    metaDescription:
      "Saltwater fish and coral food — frozen, dry pellets, flake, and live foods plus auto-feeders.",
  },
  {
    handle: "plumbing",
    label: "Plumbing & Hardware",
    tag: "Plumbing",
    description: "Bulkheads, fittings, tubing, and hardware.",
    metaDescription:
      "Reef plumbing and hardware — bulkheads, fittings, schedule 40 PVC, tubing, and aquarium installation parts.",
  },
  {
    handle: "maintenance",
    label: "Maintenance Tools",
    tag: "Maintenance",
    description: "Algae scrapers, magnets, siphons, and cleaning tools.",
    metaDescription:
      "Aquarium maintenance tools — algae scrapers, magnetic cleaners, siphons, and tank-care accessories.",
  },
];

export function findSuppliesSubcategory(
  handle: string,
): SuppliesSubcategory | undefined {
  return SUPPLIES_SUBCATEGORIES.find((c) => c.handle === handle);
}
