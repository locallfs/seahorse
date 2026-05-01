import Link from "next/link";
import { SUPPLIES_SUBCATEGORIES } from "@/lib/suppliesCategories";

export default function SuppliesNav({ active }: { active?: string }) {
  return (
    <nav className="border-b border-white/10 bg-ocean-900/40">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-wrap gap-2">
        <Link
          href="/supplies"
          className={`px-4 py-2 text-xs tracking-wider uppercase font-medium rounded transition-colors ${
            active === undefined
              ? "bg-[#FFD700] text-black"
              : "border border-white/20 text-white hover:border-white/50"
          }`}
        >
          All
        </Link>
        {SUPPLIES_SUBCATEGORIES.map((c) => (
          <Link
            key={c.handle}
            href={`/supplies/${c.handle}`}
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
