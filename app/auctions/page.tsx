import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Live Auctions — Woody's Seahorse Aquarium & Supply",
};

export default function AuctionsPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-2">
              English-Style Bidding
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Live Auctions
            </h1>
            <p className="text-white/80 mt-4 max-w-2xl">
              Bid on one-of-a-kind fish, corals, and inverts. Soft close
              protection — no sniping. Sign in and save a card to bid.
            </p>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-20 text-center">
          <p className="text-white text-lg">
            No auctions are live right now. Check back soon.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
