import Link from "next/link";
import { FISH_SUBCATEGORIES } from "@/lib/fishCategories";

export default function FishNav({ active }: { active?: string }) {
  const care = FISH_SUBCATEGORIES.filter((c) => c.group === "care");
  const species = FISH_SUBCATEGORIES.filter((c) => c.group === "species");

  return (
    <nav className="border-b border-white/10 bg-ocean-900/40">
      <div className="max-w-screen-xl mx-auto px-6 py-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium pr-1">
            All
          </span>
          <Link
            href="/fish"
            className={`px-4 py-2 text-xs tracking-wider uppercase font-medium rounded transition-colors ${
              active === undefined
                ? "bg-[#FFD700] text-black"
                : "border border-white/20 text-white hover:border-white/50"
            }`}
          >
            All Fish
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium pr-1">
            By Care
          </span>
          {care.map((c) => (
            <Link
              key={c.handle}
              href={`/fish/${c.handle}`}
              className={`px-4 py-2 text-xs tracking-wider uppercase font-medium rounded transition-colors ${
                active === c.handle
                  ? "bg-[#FFD700] text-black"
                  : "border border-white/20 text-white hover:border-white/50"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium pr-1">
            By Species
          </span>
          {species.map((c) => (
            <Link
              key={c.handle}
              href={`/fish/${c.handle}`}
              className={`px-4 py-2 text-xs tracking-wider uppercase font-medium rounded transition-colors ${
                active === c.handle
                  ? "bg-[#FFD700] text-black"
                  : "border border-white/20 text-white hover:border-white/50"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
