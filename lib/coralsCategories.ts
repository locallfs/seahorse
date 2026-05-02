export type CoralSubcategory = {
  handle: string;
  label: string;
  tag: string;
  description: string;
  metaDescription: string;
};

export const CORALS_SUBCATEGORIES: CoralSubcategory[] = [
  {
    handle: "soft",
    label: "Soft Corals",
    tag: "Soft",
    description: "Toadstools, leathers, kenya trees, xenia, and other soft corals.",
    metaDescription:
      "Soft corals for sale — toadstools, leathers, kenya trees, xenia, and more. Beginner-friendly, fast-growing reef corals.",
  },
  {
    handle: "lps",
    label: "LPS Corals",
    tag: "LPS",
    description: "Large polyp stony corals — acans, scolymia, hammers, frogspawn.",
    metaDescription:
      "LPS coral for sale — acanthastrea, scolymia, hammer, frogspawn, torch, and other large polyp stony corals.",
  },
  {
    handle: "sps",
    label: "SPS Corals",
    tag: "SPS",
    description: "Small polyp stony — acropora, montipora, stylophora.",
    metaDescription:
      "SPS coral for sale — acropora, montipora, stylophora, and other small polyp stony corals for advanced reefers.",
  },
  {
    handle: "zoanthids",
    label: "Zoanthids",
    tag: "Zoanthids",
    description: "Designer zoa and palythoa colonies.",
    metaDescription:
      "Zoanthid coral for sale — designer zoas and palythoas in vivid colors. Easy-care reef-safe polyps.",
  },
  {
    handle: "mushrooms",
    label: "Mushrooms",
    tag: "Mushrooms",
    description: "Discosoma, ricordea, rhodactis, and bounce mushrooms.",
    metaDescription:
      "Mushroom corals for sale — ricordea, discosoma, rhodactis, and bounce mushrooms. Low-light, beginner-friendly corals.",
  },
  {
    handle: "gorgonians",
    label: "Gorgonians",
    tag: "Gorgonians",
    description: "Sea fans and gorgonian colonies, photosynthetic and azoox.",
    metaDescription:
      "Gorgonian sea fans for sale — photosynthetic and non-photosynthetic species for reef and species tanks.",
  },
  {
    handle: "nps",
    label: "NPS Corals",
    tag: "NPS",
    description: "Non-photosynthetic corals — sun corals, dendros, chili corals.",
    metaDescription:
      "Non-photosynthetic (NPS) coral for sale — sun corals, dendros, chili corals. For dedicated NPS keepers.",
  },
];

export function findCoralSubcategory(
  handle: string,
): CoralSubcategory | undefined {
  return CORALS_SUBCATEGORIES.find((c) => c.handle === handle);
}
