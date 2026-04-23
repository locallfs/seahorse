import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Reef Tank Care Guide",
  description:
    "Expert care guides for saltwater aquariums — fish acclimation, coral placement, water parameters, lighting, and feeding from Woody's Seahorse.",
  alternates: { canonical: "/care" },
  openGraph: { title: "Reef Tank Care Guide — Woody's Seahorse", url: "/care" },
};

export default function CarePage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Guidance
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight max-w-3xl">
              Care
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-20">
          <div className="max-w-3xl space-y-6 text-white leading-relaxed text-base">
            <p>
              Coming soon &mdash; care guides, tips, and resources to help you
              keep your saltwater aquarium thriving.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
