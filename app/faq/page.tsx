import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about ordering live fish and corals, shipping, the live arrival guarantee, store hours, and aquarium services at Woody's Seahorse.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-16">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Help
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-white/20 bg-ocean-800/60 mb-6">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[#FFD700]"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
            Coming soon
          </h2>
          <p className="text-white/80 leading-relaxed mb-8">
            We&apos;re putting together answers to the questions we get most
            often &mdash; shipping, the live arrival guarantee, tank
            compatibility, care, and services. In the meantime, the policy
            pages below cover the essentials:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              href="/shipping-returns"
              className="px-5 py-3 bg-blue-accent hover:bg-blue-light text-white text-sm font-medium rounded transition-colors"
            >
              Shipping &amp; Returns
            </Link>
            <Link
              href="/care"
              className="px-5 py-3 border border-white/20 hover:border-white/40 text-white text-sm font-medium rounded transition-colors"
            >
              Care Guide
            </Link>
            <Link
              href="/privacy"
              className="px-5 py-3 border border-white/20 hover:border-white/40 text-white text-sm font-medium rounded transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-white/60 text-sm">
            Have a question right now? Email{" "}
            <a
              href="mailto:info@seahorseaquariumsupply.com"
              className="text-[#FFD700] hover:underline"
            >
              info@seahorseaquariumsupply.com
            </a>{" "}
            or call 503-283-4788.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
