import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Who We Are — Woody's Seahorse Aquarium & Supply",
};

const products = [
  "Purified fresh water TDS=0",
  "Premixed saltwater with Crystal Sea Salt 1.023–1.024",
  "5 Gallon Jugs",
  "Saltwater fish",
  "Inverts",
  "Live rock from Fiji and Haiti",
  "Buy, sell and trade Coral",
  "Buy, sell and trade new and used equipment",
  "Dry base rock",
  "Aquarium related plumbing supplies (bulk heads, plastic clamps, etc.)",
  "Aragonite, bright white sand",
  "VHO, Metal Halide, LED, Power Compact, T5 Lighting & Bulbs",
  "Tank maintenance and cleaning services",
  "Custom acrylic work and repairs",
  "Fish and coral food and supplements",
  "Coconut carbon",
  "Pumps and skimmers",
  "Filtration socks and pads",
  "Custom made plenums",
  "Equipment and lighting repairs",
  "Crystal Sea Salt Mix",
  "Acrylic hole drilling — free",
  "Glass hole drilling coming soon — ask",
];

const achievements = [
  "Interviewed by National Geographic and Pet Age Magazine",
  "Supplier of Crystal Sea Salt for the Newport Aquarium when ocean water is unavailable",
  "Consultant for European users of Crystal Sea",
  "Supplier of Crystal Sea to the University of Portland",
  "Supplier of Crystal Sea to OHSU",
  "Aquarium equipment insurance claims adjuster",
];

export default function WhoWeArePage() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-3">
              Our Story
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight max-w-3xl">
              Who We Are
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-20">
          <div className="max-w-3xl space-y-6 text-slate-300 leading-relaxed text-base">
            <p>
              Woody&apos;s Seahorse Aquarium & Supply was started in 1996 with
              the specific goal of providing the best of all your saltwater needs
              at the best prices.
            </p>
            <p>
              We offer our customers advice to the best of our knowledge and we
              are willing to spend time to personally teach you the hobby.
            </p>
            <p>
              We test all products and we sell only those that truly work.
            </p>
            <p>
              We hold livestock until it&apos;s eating and ready to move into
              your aquarium. We also do not import species that have little or no
              survival rate. Our livestock is kept under the best possible
              conditions and our corals under the best lighting for each species.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ocean-900/60">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-3">
              What We Offer
            </p>
            <h2 className="text-3xl font-bold text-white mb-10">
              Our Many Products & Services
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 p-4 rounded-lg border border-white/10 bg-ocean-900 text-sm text-slate-300"
                >
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-3">
              Recognition
            </p>
            <h2 className="text-3xl font-bold text-white mb-10">
              Over Our Many Years We Have Been
            </h2>
            <ul className="space-y-4 max-w-3xl">
              {achievements.map((item) => (
                <li key={item} className="flex items-start gap-4 text-slate-300">
                  <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-accent" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ocean-900/60">
          <div className="max-w-screen-xl mx-auto px-6 py-20 text-center">
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-8 leading-relaxed">
              If you have suggestions or information to share, by all means,
              please send it to us. We like to learn as much as teach.
            </p>
            <a
              href="mailto:info@seahorseaquariumsupply.com"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-accent hover:bg-blue-light text-white font-medium rounded transition-colors duration-200 text-sm tracking-wide"
            >
              Get In Touch
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
