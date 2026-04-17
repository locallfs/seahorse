import Link from "next/link";
import Header from "@/components/Header";
import HeroVideo from "@/components/HeroVideo";
import VideoBackground from "@/components/VideoBackground";
import SideScrollGallery from "@/components/SideScrollGallery";
import GoogleReviews from "@/components/GoogleReviews";
import Footer from "@/components/Footer";
import type { GalleryItem } from "@/components/SideScrollGallery";

const newArrivals: GalleryItem[] = [
  { id: 1, name: "Clown Triggerfish", price: "$89.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new1/400/533" },
  { id: 2, name: "Mandarin Dragonet", price: "$49.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new2/400/533" },
  { id: 3, name: "Flame Angelfish", price: "$129.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new3/400/533" },
  { id: 4, name: "Leopard Wrasse", price: "$74.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new4/400/533" },
  { id: 5, name: "Lyretail Anthias", price: "$59.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new5/400/533" },
  { id: 6, name: "Blue Throat Trigger", price: "$99.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new6/400/533" },
  { id: 7, name: "Purple Tang", price: "$189.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new7/400/533" },
  { id: 8, name: "Orchid Dottyback", price: "$34.99", tag: "New", gradient: "", img: "https://picsum.photos/seed/new8/400/533" },
];

const saltwaterFish: GalleryItem[] = [
  { id: 1, name: "Ocellaris Clownfish", price: "$24.99", gradient: "", img: "https://picsum.photos/seed/fish1/400/533" },
  { id: 2, name: "Yellow Tang", price: "$79.99", gradient: "", img: "https://picsum.photos/seed/fish2/400/533" },
  { id: 3, name: "Blue Hippo Tang", price: "$59.99", gradient: "", img: "https://picsum.photos/seed/fish3/400/533" },
  { id: 4, name: "Royal Gramma", price: "$29.99", gradient: "", img: "https://picsum.photos/seed/fish8/400/533" },
  { id: 5, name: "Six Line Wrasse", price: "$34.99", gradient: "", img: "https://picsum.photos/seed/fish9/400/533" },
  { id: 6, name: "Firefish Goby", price: "$22.99", gradient: "", img: "https://picsum.photos/seed/fish10/400/533" },
  { id: 7, name: "Neon Dottyback", price: "$19.99", gradient: "", img: "https://picsum.photos/seed/fish11/400/533" },
  { id: 8, name: "Coral Beauty Angel", price: "$59.99", gradient: "", img: "https://picsum.photos/seed/fish12/400/533" },
];

const inverts: GalleryItem[] = [
  { id: 1, name: "Scarlet Skunk Cleaner Shrimp", price: "$34.99", gradient: "", img: "https://picsum.photos/seed/inv1/400/533" },
  { id: 2, name: "Peppermint Shrimp", price: "$14.99", gradient: "", img: "https://picsum.photos/seed/inv2/400/533" },
  { id: 3, name: "Emerald Crab", price: "$12.99", gradient: "", img: "https://picsum.photos/seed/inv3/400/533" },
  { id: 4, name: "Turbo Snail", price: "$6.99", gradient: "", img: "https://picsum.photos/seed/inv4/400/533" },
  { id: 5, name: "Blue Leg Hermit Crab", price: "$4.99", gradient: "", img: "https://picsum.photos/seed/inv5/400/533" },
  { id: 6, name: "Sea Urchin", price: "$24.99", gradient: "", img: "https://picsum.photos/seed/inv6/400/533" },
  { id: 7, name: "Feather Duster Worm", price: "$18.99", gradient: "", img: "https://picsum.photos/seed/inv7/400/533" },
  { id: 8, name: "Nassarius Snail (6-pack)", price: "$19.99", gradient: "", img: "https://picsum.photos/seed/inv8/400/533" },
];

const corals: GalleryItem[] = [
  { id: 1, name: "Hammer Coral — Branching", price: "$79.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral1/400/533" },
  { id: 2, name: "Torch Coral — Gold", price: "$149.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral2/400/533" },
  { id: 3, name: "Duncan Coral", price: "$44.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral3/400/533" },
  { id: 4, name: "Frogspawn Coral", price: "$89.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral4/400/533" },
  { id: 5, name: "Brain Coral — Trachyphyllia", price: "$119.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral5/400/533" },
  { id: 6, name: "Mushroom Coral — Rainbow", price: "$59.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral6/400/533" },
  { id: 7, name: "Acropora — Tri-Color", price: "$199.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral7/400/533" },
  { id: 8, name: "Zoa Garden — Mixed", price: "$69.99", tag: "WYSIWYG", gradient: "", img: "https://picsum.photos/seed/coral8/400/533" },
];

const supplies: GalleryItem[] = [
  { id: 1, name: "AI Prime 16HD LED Reef Light", price: "$249.99", gradient: "", img: "https://picsum.photos/seed/sup1/400/533" },
  { id: 2, name: "Protein Skimmer — 150 Gal", price: "$189.99", gradient: "", img: "https://picsum.photos/seed/sup2/400/533" },
  { id: 3, name: "Sicce Wave Pump", price: "$89.99", gradient: "", img: "https://picsum.photos/seed/sup3/400/533" },
  { id: 4, name: "Reef Chemistry 3-Part Kit", price: "$49.99", gradient: "", img: "https://picsum.photos/seed/sup4/400/533" },
  { id: 5, name: "Live Rock — Premium (10 lb)", price: "$79.99", gradient: "", img: "https://picsum.photos/seed/sup5/400/533" },
  { id: 6, name: "Reef Salt Mix — 200 Gal", price: "$64.99", gradient: "", img: "https://picsum.photos/seed/sup6/400/533" },
  { id: 7, name: "Refractometer", price: "$29.99", gradient: "", img: "https://picsum.photos/seed/sup7/400/533" },
  { id: 8, name: "RO/DI Water Filter System", price: "$199.99", gradient: "", img: "https://picsum.photos/seed/sup8/400/533" },
];

export default function HomePage() {
  return (
    <>
      <VideoBackground />
      <Header />
      <main>
        <HeroVideo />

        <div className="bg-ocean-950/80 backdrop-blur-sm">
          <SideScrollGallery
            title="New Arrivals"
            subtitle="Just In"
            items={newArrivals}
            viewAllHref="/new-arrivals"
            accentColor="#38bdf8"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Saltwater Fish"
            subtitle="Live Fish"
            items={saltwaterFish}
            viewAllHref="/fish"
            accentColor="#0ea5e9"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Invertebrates"
            subtitle="Inverts"
            items={inverts}
            viewAllHref="/inverts"
            accentColor="#818cf8"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="WYSIWYG Corals"
            subtitle="What You See Is What You Get"
            items={corals}
            viewAllHref="/corals"
            accentColor="#f472b6"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Aquarium Supplies"
            subtitle="Equipment & Accessories"
            items={supplies}
            viewAllHref="/supplies"
            accentColor="#34d399"
          />
        </div>

        <div className="bg-ocean-950/80 backdrop-blur-sm border-t border-white/10">
          <GoogleReviews />
        </div>

        <section className="py-24 bg-ocean-900/80 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/maintenance"
              className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/25 p-10 bg-ocean-800 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-3">
                Services
              </p>
              <h3 className="text-2xl font-bold text-white mb-3">
                Aquarium Maintenance
              </h3>
              <p className="text-white text-sm leading-relaxed mb-6">
                Regular tank cleaning, water chemistry, livestock health
                monitoring, and equipment servicing from our expert team.
              </p>
              <span className="text-sm text-white group-hover:text-blue-light transition-colors flex items-center gap-2">
                Learn More
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 6h8M7 3l3 3-3 3" />
                </svg>
              </span>
            </Link>

            <Link
              href="/installations"
              className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/25 p-10 bg-ocean-800 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="text-xs tracking-[0.2em] uppercase text-[#FFD700] font-medium mb-3">
                Services
              </p>
              <h3 className="text-2xl font-bold text-white mb-3">
                Custom Installations
              </h3>
              <p className="text-white text-sm leading-relaxed mb-6">
                Full aquarium builds from design to completion — in-home, office,
                and commercial installations throughout the Pacific Northwest.
              </p>
              <span className="text-sm text-white group-hover:text-blue-light transition-colors flex items-center gap-2">
                Learn More
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 6h8M7 3l3 3-3 3" />
                </svg>
              </span>
            </Link>
          </div>
        </section>

        <section className="py-20 bg-ocean-950/80 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6">
            <p className="text-xs tracking-[0.25em] uppercase font-medium mb-2 text-[#FFD700]">
              Visit Us
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-8">
              Our Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold text-white">
                  Woody&apos;s Seahorse Aquarium &amp; Supply
                </h3>
                <p className="text-white text-sm">
                  106 NE Russet St.<br />
                  Portland, Oregon 97211
                </p>
                <p className="text-white text-xs">
                  The shop is on the gravel street (Rodney) around the corner.
                </p>
                <p className="text-white text-sm leading-relaxed">
                  Portland, Oregon&apos;s premier saltwater fish and coral specialist since 1996. Stop by to see our tanks in person — we&apos;d love to help you build your dream reef.
                </p>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Woody's+Seahorse+Aquarium+%26+Supply,+106+NE+Russet+St,+Portland,+OR+97211&destination_place_id=ChIJD0GFAfemlVQT_wCyRbJs2w"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#FFD700] text-sm font-medium hover:underline"
                >
                  Get Directions
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 6h8M7 3l3 3-3 3" />
                  </svg>
                </a>
              </div>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Woody's+Seahorse+Aquarium+%26+Supply,+106+NE+Russet+St,+Portland,+OR+97211&destination_place_id=ChIJD0GFAfemlVQT_wCyRbJs2w"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-all"
              >
                <img
                  src="/api/static-map"
                  alt="Woody's Seahorse Aquarium & Supply location"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
