export const LIVE_KEYWORDS = [
  "fish",
  "coral",
  "invert",
  "shrimp",
  "crab",
  "snail",
  "anemone",
  "seahorse",
  "clown",
  "tang",
  "wrasse",
  "goby",
  "angel",
  "urchin",
  "starfish",
];

export function isLiveAnimal(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return LIVE_KEYWORDS.some((kw) => t.includes(kw));
}
