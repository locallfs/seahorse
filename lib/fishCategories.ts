export type FishSubcategory = {
  handle: string;
  label: string;
  tag: string;
  description: string;
  metaDescription: string;
  group: "care" | "species";
};

export const FISH_SUBCATEGORIES: FishSubcategory[] = [
  // Care / temperament
  {
    handle: "reef-safe",
    label: "Reef Safe",
    tag: "Reef Safe",
    group: "care",
    description: "Fish that won't pick at corals or invertebrates.",
    metaDescription:
      "Reef-safe saltwater fish — species that leave corals, shrimp, and inverts alone. Curated picks for mixed reef tanks.",
  },
  {
    handle: "caution",
    label: "With Caution",
    tag: "With Caution",
    group: "care",
    description: "Mostly reef compatible, but watch for the occasional nibble.",
    metaDescription:
      "Saltwater fish that are reef-compatible with caution — generally safe but may sample corals or inverts in some setups.",
  },
  {
    handle: "aggressive",
    label: "Aggressive / Predator",
    tag: "Aggressive",
    group: "care",
    description: "Predatory and territorial species — best in species or FOWLR tanks.",
    metaDescription:
      "Aggressive and predatory saltwater fish — lionfish, eels, triggers, pufferfish. For FOWLR and species tanks.",
  },
  {
    handle: "beginner-friendly",
    label: "Beginner Friendly",
    tag: "Beginner Friendly",
    group: "care",
    description: "Hardy, forgiving species great for first-time reefkeepers.",
    metaDescription:
      "Beginner-friendly saltwater fish — hardy, easy-to-care-for species perfect for new reef tanks.",
  },
  {
    handle: "nano",
    label: "Nano Fish",
    tag: "Nano",
    group: "care",
    description: "Small, peaceful fish for tanks under 30 gallons.",
    metaDescription:
      "Nano saltwater fish — small, peaceful species that thrive in pico and nano reef tanks under 30 gallons.",
  },
  {
    handle: "expert-only",
    label: "Expert Only",
    tag: "Expert Only",
    group: "care",
    description: "Demanding fish for advanced reefers — special diet, stable params.",
    metaDescription:
      "Expert-level saltwater fish — demanding species requiring specialized diets, mature systems, and rock-stable parameters.",
  },

  // Species / family
  {
    handle: "clownfish",
    label: "Clownfish",
    tag: "Clownfish",
    group: "species",
    description: "Ocellaris, percula, designer clowns, and rare morphs.",
    metaDescription:
      "Clownfish for sale — ocellaris, percula, snowflake, black storm, and designer clownfish morphs. Captive-bred.",
  },
  {
    handle: "tangs",
    label: "Tangs",
    tag: "Tangs",
    group: "species",
    description: "Yellow, blue, sailfin, scopas, kole, and more.",
    metaDescription:
      "Saltwater tangs and surgeonfish for sale — yellow, blue, scopas, kole, sailfin tangs and other reef-safe grazers.",
  },
  {
    handle: "angelfish",
    label: "Angelfish",
    tag: "Angelfish",
    group: "species",
    description: "Dwarf and large angels — coral beauty, flame, emperor.",
    metaDescription:
      "Saltwater angelfish for sale — dwarf angels (coral beauty, flame, lemonpeel) and large angels (emperor, queen, French).",
  },
  {
    handle: "wrasses",
    label: "Wrasses",
    tag: "Wrasses",
    group: "species",
    description: "Fairy, flasher, leopard, and cleaner wrasses.",
    metaDescription:
      "Saltwater wrasses for sale — fairy wrasses, flasher wrasses, leopard wrasses, and cleaner wrasses for reef tanks.",
  },
  {
    handle: "gobies",
    label: "Gobies",
    tag: "Gobies",
    group: "species",
    description: "Watchman, shrimp, neon, and clown gobies.",
    metaDescription:
      "Saltwater gobies for sale — watchman, neon, clown, and shrimp gobies. Perfect peaceful bottom-dwellers for reef tanks.",
  },
  {
    handle: "blennies",
    label: "Blennies",
    tag: "Blennies",
    group: "species",
    description: "Lawnmower, midas, tailspot, and bicolor blennies.",
    metaDescription:
      "Saltwater blennies for sale — lawnmower, midas, tailspot, bicolor and other algae-grazing blennies for reef tanks.",
  },
  {
    handle: "basslets-grammas",
    label: "Basslets & Grammas",
    tag: "Basslets & Grammas",
    group: "species",
    description: "Royal gramma, swissguard basslet, and chalk bass.",
    metaDescription:
      "Basslets and grammas for sale — royal gramma, swissguard basslet, chalk bass. Vibrant, peaceful reef fish.",
  },
  {
    handle: "dottybacks",
    label: "Dottybacks",
    tag: "Dottybacks",
    group: "species",
    description: "Orchid, neon, and bicolor dottybacks.",
    metaDescription:
      "Saltwater dottybacks for sale — orchid, neon, bicolor and other Pseudochromis species for reef tanks.",
  },
  {
    handle: "cardinalfish",
    label: "Cardinalfish",
    tag: "Cardinalfish",
    group: "species",
    description: "Banggai, pajama, and orange-spotted cardinals.",
    metaDescription:
      "Cardinalfish for sale — Banggai, pajama, and orange-spotted cardinals. Peaceful nocturnal schooling fish.",
  },
  {
    handle: "damselfish-chromis",
    label: "Damselfish & Chromis",
    tag: "Damselfish & Chromis",
    group: "species",
    description: "Blue chromis, yellowtail damsels, and azure damsels.",
    metaDescription:
      "Damselfish and chromis for sale — blue chromis, yellowtail damselfish, azure damsels, and other hardy reef species.",
  },
  {
    handle: "hawkfish",
    label: "Hawkfish",
    tag: "Hawkfish",
    group: "species",
    description: "Flame, longnose, and falco's hawkfish.",
    metaDescription:
      "Saltwater hawkfish for sale — flame hawkfish, longnose hawkfish, and falco's hawkfish for reef and FOWLR tanks.",
  },
  {
    handle: "butterflyfish",
    label: "Butterflyfish",
    tag: "Butterflyfish",
    group: "species",
    description: "Copperband, longnose, raccoon, and pyramid butterflies.",
    metaDescription:
      "Butterflyfish for sale — copperband, longnose, raccoon, pyramid and other Chaetodon species. Some reef-safe with caution.",
  },
  {
    handle: "triggerfish",
    label: "Triggerfish",
    tag: "Triggerfish",
    group: "species",
    description: "Niger, blue throat, picasso, and clown triggers.",
    metaDescription:
      "Triggerfish for sale — niger, blue throat, picasso, clown and other Balistidae species. For FOWLR and predator tanks.",
  },
  {
    handle: "pufferfish",
    label: "Pufferfish",
    tag: "Pufferfish",
    group: "species",
    description: "Porcupine, dogface, and valentini puffers.",
    metaDescription:
      "Saltwater pufferfish for sale — porcupine, dogface, valentini and other puffers. Personality-filled tankmates.",
  },
  {
    handle: "lionfish-scorpionfish",
    label: "Lionfish & Scorpionfish",
    tag: "Lionfish & Scorpionfish",
    group: "species",
    description: "Volitan, dwarf, fuzzy dwarf, and leaf scorpionfish.",
    metaDescription:
      "Lionfish and scorpionfish for sale — volitan, dwarf, fuzzy dwarf lionfish and leaf scorpionfish for predator tanks.",
  },
  {
    handle: "eels",
    label: "Eels",
    tag: "Eels",
    group: "species",
    description: "Snowflake, zebra, and ribbon eels.",
    metaDescription:
      "Saltwater eels for sale — snowflake, zebra, ribbon and other moray eels. Striking centerpiece predators.",
  },
  {
    handle: "rabbitfish-foxfaces",
    label: "Rabbitfish & Foxfaces",
    tag: "Rabbitfish & Foxfaces",
    group: "species",
    description: "Foxface lo, magnificent, and bicolor rabbitfish.",
    metaDescription:
      "Rabbitfish and foxfaces for sale — foxface lo, magnificent rabbitfish, bicolor foxface. Algae-grazing reef fish.",
  },
  {
    handle: "anthias",
    label: "Anthias",
    tag: "Anthias",
    group: "species",
    description: "Lyretail, dispar, and bartlett's anthias.",
    metaDescription:
      "Anthias for sale — lyretail, dispar, bartlett's and other Pseudanthias species. Active mid-water schooling fish.",
  },
  {
    handle: "seahorses-pipefish",
    label: "Seahorses & Pipefish",
    tag: "Seahorses & Pipefish",
    group: "species",
    description: "Captive-bred seahorses and pipefish for species tanks.",
    metaDescription:
      "Seahorses and pipefish for sale — captive-bred Hippocampus and dragon pipefish for dedicated species tanks.",
  },
  {
    handle: "dragonets",
    label: "Dragonets",
    tag: "Dragonets",
    group: "species",
    description: "Mandarin and scooter dragonets.",
    metaDescription:
      "Dragonets for sale — mandarin dragonets and scooter blennies. Stunning fish for established mature reef tanks.",
  },
  {
    handle: "filefish",
    label: "Filefish",
    tag: "Filefish",
    group: "species",
    description: "Aiptasia-eating, tassel, and matted filefish.",
    metaDescription:
      "Filefish for sale — aiptasia-eating filefish, tassel and matted filefish. Specialized reef tank residents.",
  },
];

export function findFishSubcategory(
  handle: string,
): FishSubcategory | undefined {
  return FISH_SUBCATEGORIES.find((c) => c.handle === handle);
}
