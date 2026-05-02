import Link from "next/link";
import { CORALS_SUBCATEGORIES } from "@/lib/coralsCategories";

export default function CoralsNav({ active }: { active?: string }) {
  return (
    <nav className="border-b border-white/10 bg-ocean-900/40">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-wrap gap-2">
        <Link
          href="/corals"
          className={`px-4 py-2 text-xs tracking-wider uppercase font-medium rounded transition-colors ${
            active === undefined
              ? "bg-[#FFD700] text-black"
              : "border border-white/20 text-white hover:border-white/50"
          }`}
        >
          All
        </Link>
        {CORALS_SUBCATEGORIES.map((c) => (
          <Link
            key={c.handle}
            href={`/corals/${c.handle}`}
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
    </nav>
  );
}
