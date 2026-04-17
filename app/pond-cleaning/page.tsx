import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "Pond Cleaning Services — Woody's Seahorse Aquarium & Supply",
};

const services = [
  "Complete pond debris and sludge removal",
  "Filter and pump cleaning and inspection",
  "Water quality testing and treatment",
  "Algae control and prevention",
  "Seasonal pond maintenance",
  "Liner inspection and repair assessment",
  "Fish health checks during cleaning",
  "Waterfall and fountain cleaning",
];

export default function PondCleaningPage() {
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
              Pond Cleaning Services
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="max-w-3xl space-y-6 text-white leading-relaxed text-base mb-16">
            <p>
              Keep your outdoor pond looking its best with professional cleaning
              and maintenance from Woody&apos;s Seahorse. Whether you have a koi
              pond, water garden, or decorative water feature, our experienced
              team provides thorough cleaning services to maintain water quality
              and keep your fish healthy.
            </p>
            <p>
              We handle everything from routine seasonal cleanings to deep
              restorations for neglected ponds. Our team works carefully around
              your fish and plants to minimize stress while delivering a
              spotless result.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute -right-[25%] top-1/2 -translate-y-1/2 w-[600px] rounded-xl overflow-hidden border border-white/10">
              <Image
                src="/images/pond-cleaning-filter.webp"
                alt=""
                width={800}
                height={600}
                className="w-full h-auto object-cover"
              />
            </div>

            <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              What We Offer
            </p>
            <h2 className="text-3xl font-bold text-white mb-10">
              Our Pond Cleaning Services
            </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mb-16">
            {services.map((item) => (
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

          <div className="rounded-xl border border-white/10 bg-ocean-900 p-10 max-w-xl">
            <h3 className="text-xl font-bold text-white mb-3">
              Request a Quote
            </h3>
            <p className="text-white text-sm leading-relaxed mb-6">
              Every pond is different. Contact us for a free estimate based on
              your pond&apos;s size and condition.
            </p>
            <QuoteForm service="Pond Cleaning" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
