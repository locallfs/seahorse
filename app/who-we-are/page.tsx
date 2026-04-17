import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "Who We Are — Woody's Seahorse Aquarium & Supply",
};

const products = [
  "Free salinity tests and refractometer calibrations",
  "Purified Deionized Fresh Water",
  "Premium Premixed Saltwater",
  "5-Gallon and 3-gallon jugs",
  "Saltwater fish",
  "Live copepods",
  "Captive-bred Seahorses",
  "Inverts (shrimps, snails, crabs etc.)",
  "Live Rock",
  "Buy, Sell & Trade Coral",
  "High quality reef gear",
  "Aquarium related plumbing supplies (bulk heads, plastic clamps, hose etc.)",
  "Live Sand and starter bacteria",
  "LED reef tank lighting",
  "Tank maintenance and installation services",
  "Fish and coral food",
  "Dosing supplies, supplements and medications",
  "Bulk Activated Carbon, GFO and DI Resin",
  "Pumps, skimmers & heaters",
  "Filtration socks, pads & filter fleece rolls",
  "Fritz RPM & Redsea Salt",
  "Acrylic hole drilling",
  "Glass hole drilling",
  "Consultations",
  "Onsite water testing, home & ICP test kits",
];

const values = [
  {
    title: "Creature\u2011First Care",
    description:
      "Every fish, coral, and invertebrate in our store receives attentive, evidence\u2011based care. We prioritize stable systems, proper nutrition, and stress\u2011free acclimation so our animals arrive healthy and stay healthy.",
  },
  {
    title: "Sustainable Reefkeeping",
    description:
      "We support responsible collection, aquaculture, and long\u2011term reef stewardship. Our livestock selection emphasizes captive\u2011bred fish, aquacultured corals, and suppliers who share our commitment to ethical practices.",
  },
  {
    title: "Education & Support",
    description:
      "Whether you\u2019re setting up your first nano tank or fine\u2011tuning a mature reef, we\u2019re here to help you succeed. We offer clear, practical guidance rooted in real experience \u2014 not sales pressure.",
  },
  {
    title: "A Community Hub",
    description:
      "Seahorse Aquarium & Supply has always been more than a store. It\u2019s a place where hobbyists connect, learn, troubleshoot, and celebrate the beauty of marine life together.",
  },
];

export default function WhoWeArePage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Our Story
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight max-w-3xl">
              Who We Are
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-20">
          <div className="max-w-3xl space-y-6 text-white leading-relaxed text-base">
            <p>
              Woody&apos;s Seahorse Aquarium &amp; Supply has been Portland&apos;s
              trusted saltwater aquarium store since 1996. Built on a foundation of
              responsible reefkeeping, exceptional animal care, and honest guidance,
              our family&#8209;run business continues to grow thoughtfully as the
              next generation carries the mission forward.
            </p>
            <p>
              What started as Woody&apos;s passion for saltwater aquariums has grown
              into a modern, community&#8209;focused marine specialty shop. Today,
              the next generation leads the store with updated systems, advanced
              reef&#8209;keeping knowledge, and a continued dedication to ethical
              practices. Our long history in the hobby allows us to blend decades of
              experience with the latest innovations in aquarium care.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ocean-900/60">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Our Values
            </p>
            <h2 className="text-3xl font-bold text-white mb-12">
              What We Stand For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((item) => (
                <div
                  key={item.title}
                  className="p-8 rounded-xl border border-white/10 bg-ocean-900"
                >
                  <h3 className="text-xl font-bold text-white mb-4">
                    {item.title}
                  </h3>
                  <p className="text-white text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Our Promise
            </p>
            <h2 className="text-3xl font-bold text-white mb-8">
              Expert Advice &amp; Proven Products
            </h2>
            <div className="max-w-3xl space-y-6 text-white leading-relaxed text-base">
              <p>
                At Woody&apos;s, we believe in teaching the hobby &mdash; not just
                selling it.
              </p>
              <p>
                We test the products we carry and recommend only equipment that truly
                works. Whether you&apos;re setting up your first saltwater tank or
                maintaining a mature reef system, our team provides clear, practical
                guidance based on real&#8209;world experience.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ocean-900/60">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              What We Offer
            </p>
            <h2 className="text-3xl font-bold text-white mb-10">
              Our Products &amp; Services
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 p-4 rounded-lg border border-white/10 bg-ocean-900 text-sm text-white"
                >
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Recognition
            </p>
            <h2 className="text-3xl font-bold text-white mb-10">
              Over Our Many Years We Have Been
            </h2>

            <ul className="space-y-4 max-w-3xl mb-12">
              {[
                "Interviewed by National Geographic and Pet Age Magazine",
                "Supplier of Crystal Sea Salt for the Newport Aquarium when ocean water is unavailable",
                "Supplier of Crystal Sea to the University of Portland",
                "Supplier of Crystal Sea to OHSU",
                "Aquarium equipment insurance claims adjuster",
              ].map((item) => (
                <li key={item} className="flex items-start gap-4 text-white">
                  <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <blockquote className="max-w-3xl p-8 rounded-xl border border-white/10 bg-ocean-900">
              <p className="text-white text-sm leading-relaxed mb-4">
                &ldquo;We are a large scientific research lab here in Portland using
                freshwater zebrafish (Danio rerio) as a model organism to study
                synaptic electrophysiology and neurogenetics. Our recirculating system
                houses several thousand zebrafish in over 200 tanks. We also raise
                zebrafish from larval stages (about the size of a fruit fly) up to
                adulthood. Even though these are a freshwater species, they require
                some dissolved salts in their water for optimal health and
                osmoregulation and to discourage parasites. With our large system and
                ~10% daily water change, we go through salt fairly quickly. We
                additionally use marine salts in the culturing of brine shrimp and
                marine rotifers, two of our main fish foods. After investigating
                available commercial marine salts, we settled on Crystal Sea as the
                best choice for our system. Rather than pay shipping on multiple 50lbs.
                boxes of salt every few months, we sought a local supplier who could
                deal in large quantities. Seahorse Aquarium Supply was recommended by a
                co-worker. Woody has been great, always accommodating our needs, and
                his price on Crystal Sea saves us hundreds on shipping costs every
                year.&rdquo;
              </p>
              <cite className="text-[#FFD700] text-sm font-medium not-italic">
                &mdash; OHSU Brehm Lab
              </cite>
            </blockquote>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ocean-900/60">
          <div className="max-w-screen-xl mx-auto px-6 py-20 text-center">
            <p className="text-white text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Have questions or want to learn more? We&apos;d love to hear from you.
            </p>
            <QuoteForm service="General Inquiry" buttonLabel="Get In Touch" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
