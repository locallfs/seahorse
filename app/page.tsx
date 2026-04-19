import Link from "next/link";
import Header from "@/components/Header";
import HeroVideo from "@/components/HeroVideo";
import VideoBackground from "@/components/VideoBackground";
import SideScrollGallery from "@/components/SideScrollGallery";
import GoogleReviews from "@/components/GoogleReviews";
import Footer from "@/components/Footer";

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
            typeValue="New Arrival"
            viewAllHref="/new-arrivals"
            tag="New"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Saltwater Fish"
            subtitle="Live Fish"
            typeValue="Fish"
            viewAllHref="/fish"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Invertebrates"
            subtitle="Inverts"
            typeValue="Invertebrate"
            viewAllHref="/inverts"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="WYSIWYG Corals"
            subtitle="What You See Is What You Get"
            typeValue="Coral"
            viewAllHref="/corals"
            tag="WYSIWYG"
          />

          <div className="max-w-screen-xl mx-auto px-6">
            <div className="border-t border-white/5" />
          </div>

          <SideScrollGallery
            title="Aquarium Supplies"
            subtitle="Equipment & Accessories"
            typeValue="Supply"
            viewAllHref="/supplies"
          />
        </div>

        <div className="bg-ocean-950/80 backdrop-blur-sm border-t border-white/10">
          <GoogleReviews />
        </div>

        <section className="py-24 bg-ocean-900/80 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/maintenance"
              className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/25 p-10 bg-ocean-800 transition-all duration-300 glow-white"
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
              className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/25 p-10 bg-ocean-800 transition-all duration-300 glow-white"
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
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium mb-2 text-[#FFD700]">
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
                className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-all glow-white"
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
