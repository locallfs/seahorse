import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Tank Moving Services — Woody's Seahorse Aquarium & Supply",
};

const services = [
  "Full aquarium breakdown and transport",
  "Safe fish and coral packing and transfer",
  "Live rock and sand handling",
  "Equipment disconnection and reconnection",
  "Tank setup at new location",
  "Water chemistry matching at destination",
  "Post-move monitoring and adjustments",
  "Local and regional moves throughout the Pacific Northwest",
];

export default function TankMovingPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              Services
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Tank Moving Services
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            <div className="space-y-6 text-white leading-relaxed text-base">
              <p>
                Moving an aquarium is one of the most stressful things a hobbyist
                can face. A single mistake can mean lost livestock, cracked glass,
                or a crashed cycle. Let our team handle it so your tank arrives
                safe and your animals stay healthy.
              </p>
              <p>
                We&apos;ve moved everything from nano tanks to 300+ gallon reef
                systems. Our process is designed to keep water parameters stable,
                minimize stress on your fish and corals, and get your tank back up
                and running as quickly as possible at your new location.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <Image
                src="/images/large-tank-moves.jpg"
                alt=""
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
            What We Offer
          </p>
          <h2 className="text-3xl font-bold text-white mb-10">
            Our Tank Moving Services
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mb-16">
            {services.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 p-4 rounded-lg border border-white/10 bg-ocean-900 text-sm text-slate-300"
              >
                <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                {item}
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/10 bg-ocean-900 p-10 max-w-xl">
            <h3 className="text-xl font-bold text-white mb-3">
              Request a Quote
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Pricing depends on tank size, distance, and livestock. Contact us
              for a free estimate.
            </p>
            <a
              href="mailto:Terry@seahorse-nw.com?subject=Tank Moving Quote Request"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-accent hover:bg-blue-light text-white font-medium rounded transition-colors duration-200 text-sm tracking-wide"
            >
              Get a Quote
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
