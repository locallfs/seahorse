import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "Custom Installations — Woody's Seahorse Aquarium & Supply",
};

const services = [
  "Full system design and planning consultation",
  "In-home, office, and commercial aquarium builds",
  "Custom sump and filtration setup",
  "Plumbing, electrical, and equipment installation",
  "Live rock aquascaping and hardscape design",
  "Livestock selection and stocking plan",
  "Initial water chemistry and cycle management",
  "Post-install monitoring and adjustment period",
  "Wall-mounted and built-in aquarium installations",
  "Large-format reef systems up to 500+ gallons",
];

export default function InstallationsPage() {
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
              Custom Installations
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="space-y-6 text-white leading-relaxed text-base mb-16">
                <p>
                  Whether you&apos;re dreaming of a stunning reef centerpiece in your
                  living room or a show-stopping aquarium in your office lobby, our
                  team handles every detail from concept to completion. We design,
                  build, and install custom aquarium systems throughout the Pacific
                  Northwest.
                </p>
                <p>
                  Every installation starts with a consultation to understand your
                  space, your vision, and your experience level. We&apos;ll handle
                  the technical side — plumbing, filtration, lighting, and
                  aquascaping — so you can enjoy the result from day one.
                </p>
              </div>

              <p className="text-xs tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
                What We Offer
              </p>
              <h2 className="text-3xl font-bold text-white mb-10">
                Our Installation Services
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-16">
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

              <div className="rounded-xl border border-white/10 bg-ocean-900 p-10">
                <h3 className="text-xl font-bold text-white mb-3">
                  Request a Quote
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Every installation is different. Tell us about your space and
                  what you have in mind — we&apos;ll put together a plan and
                  estimate.
                </p>
                <QuoteForm service="Custom Installation" />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-xl overflow-hidden border border-white/10">
                <Image
                  src="/images/customreef3.png"
                  alt=""
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <Image
                  src="/images/customreef1.webp"
                  alt=""
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <Image
                  src="/images/customreef2.jpg"
                  alt=""
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
