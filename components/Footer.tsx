import Link from "next/link";
import Image from "next/image";

const shopLinks = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Fish", href: "/fish" },
  { label: "Corals", href: "/corals" },
  { label: "Invertebrates", href: "/inverts" },
  { label: "Supplies", href: "/supplies" },
];

const serviceLinks = [
  { label: "Maintenance", href: "/maintenance" },
  { label: "Installations", href: "/installations" },
  { label: "Store", href: "/store" },
];

const hours = [
  { day: "Monday", time: "Closed" },
  { day: "Tuesday", time: "Closed" },
  { day: "Wednesday", time: "12 PM – 7 PM" },
  { day: "Thursday", time: "12 PM – 7 PM" },
  { day: "Friday", time: "12 PM – 7 PM" },
  { day: "Saturday", time: "12 PM – 7 PM" },
  { day: "Sunday", time: "12 PM – 6 PM" },
];

export default function Footer() {
  return (
    <footer className="bg-ocean-900 border-t border-white/10 mt-auto">
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[auto_auto_auto_auto_auto_auto] gap-x-10 gap-y-8 lg:justify-between">
          <div className="lg:col-span-1">
            <Image
              src="/images/LogoFullNameOnly.png"
              alt="Woody's Seahorse Aquarium & Supply"
              width={400}
              height={140}
              className="h-32 w-auto object-contain mb-4"
            />
            <p className="text-white text-sm leading-relaxed">
              Pacific Northwest&apos;s premier saltwater fish and coral
              specialist since 1996.
            </p>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
              Shop
            </p>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white hover:text-[#FFD700] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
              Services
            </p>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white hover:text-[#FFD700] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-8">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
                Location
              </p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Woody's+Seahorse+Aquarium+%26+Supply,+106+NE+Russet+St,+Portland,+OR+97211&destination_place_id=ChIJD0GFAfemlVQT_wCyRbJs2w"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white leading-relaxed hover:text-[#FFD700] transition-colors"
              >
                106 NE Russet St.<br />
                Portland, Oregon 97211
              </a>
              <p className="text-xs text-white/60 mt-2">
                The shop is on the gravel street<br />
                (Rodney) around the corner.
              </p>
            </div>

            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
                Contact Us
              </p>
              <ul className="space-y-3 text-sm text-white">
                <li>
                  <span className="text-white/60 text-xs">Phone:</span>{" "}
                  <a href="tel:5032834788" className="hover:text-[#FFD700] transition-colors">503-283-4788</a>
                </li>
                <li>
                  <span className="text-white/60 text-xs">Email:</span>{" "}
                  <a href="mailto:info@seahorseaquariumsupply.com" className="hover:text-[#FFD700] transition-colors">
                    info@seahorseaquariumsupply.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
              Local Store Hours
            </p>
            <ul className="space-y-2 w-48">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between text-sm">
                  <span className="text-white">{h.day}</span>
                  <span className={h.time === "Closed" ? "text-white/50" : "text-white"}>
                    {h.time}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/60 mt-4 leading-relaxed w-48">
              We are closed for all major Holidays,<br />
              we hope you enjoy yours too!
            </p>
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-5">
              Follow Us
            </p>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/SeahorseAquariumSupply" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white hover:text-[#FFD700] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white hover:text-[#FFD700] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="https://www.tiktok.com/@seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-white hover:text-[#FFD700] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white">
            &copy; {new Date().getFullYear()} Secret Reef LLC — All rights reserved.
          </p>
          <p className="text-xs text-white">
            106 NE Russet St. Portland, OR 97211 &middot; 503-283-4788
          </p>
        </div>
      </div>
    </footer>
  );
}
