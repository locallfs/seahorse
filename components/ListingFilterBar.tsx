import FiltersPanel from "./FiltersPanel";
import type { FiltersConfig } from "@/lib/filtersModel";

// The slim bar under a listing page's title that holds the ONE consolidated
// Filters control (replaces the old rows of chips scattered across the top).
export default function ListingFilterBar({
  config,
  activeValue,
}: {
  config: FiltersConfig;
  activeValue: string | null;
}) {
  return (
    <div className="border-b border-white/10 bg-ocean-900/40">
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <FiltersPanel config={config} activeValue={activeValue} />
      </div>
    </div>
  );
}
