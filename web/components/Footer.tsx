import Link from "next/link";
import Image from "next/image";

const shopLinks = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Saltwater Fish", href: "/fish" },
  { label: "Invertebrates", href: "/inverts" },
  { label: "WYSIWYG Corals", href: "/corals" },
  { label: "Aquarium Supplies", href: "/supplies" },
];

const serviceLinks = [
  { label: "Maintenance", href: "/maintenance" },
  { label: "Installations", href: "/installations" },
  { label: "Store", href: "/store" },
];

export default function Footer() {
  return (
    <footer className="bg-ocean-900 border-t border-white/10 mt-auto">
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <Image
              src="/images/logo.png"
              alt="Woody's Seahorse Aquarium & Supply"
              width={120}
              height={42}
              className="h-10 w-auto object-contain mb-4"
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              Pacific Northwest&apos;s premier saltwater fish and coral
              specialist since 1996.
            </p>
            <p className="text-slate-500 text-xs mt-4">
              seahorseaquariumsupply.com
            </p>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-slate-500 font-medium mb-5">
              Shop
            </p>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-slate-500 font-medium mb-5">
              Services
            </p>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-slate-500 font-medium mb-5">
              Contact
            </p>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>Seahorse Aquarium & Supply</li>
              <li>Pacific Northwest</li>
              <li>
                <a
                  href="mailto:info@seahorseaquariumsupply.com"
                  className="hover:text-white transition-colors duration-200"
                >
                  info@seahorseaquariumsupply.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Woody&apos;s Seahorse Aquarium &
            Supply. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-accent animate-pulse" />
            <p className="text-xs text-slate-600">
              Live animals available — ships 2-day or faster
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
