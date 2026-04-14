import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Aquarium Maintenance — Woody's Seahorse Aquarium & Supply" };

const plans = [
  {
    name: "Woody's Monthly Maintenance",
    freq: "12 Visits / Year",
    tagline: "For the reefer who wants expert guidance, but still control all aspects of care. Primarily a helping hand service.",
    includes: [
      "Monthly professional maintenance visits",
      "Water testing and adjustments",
      "Equipment checks",
      "Interim consultations",
      "Controller monitoring",
    ],
    note: "For the absolute best quality water and happy aquatic life, you will need to supplement our monthly service with thorough maintenance between visits. Please use our detailed instruction guide we left with you for the appropriate way to keep perfect parameters. Please contact us immediately if you need assistance.",
  },
  {
    name: "Woody's Bi-Weekly Maintenance",
    freq: "26 Visits / Year",
    tagline: "Perfect for hands-on aquarium enthusiasts who want professional support while maintaining involvement in their aquarium's care.",
    includes: [
      "Bi-weekly professional maintenance visits",
      "Professional water quality testing and adjustment",
      "Essential system cleaning",
      "Equipment checks",
      "Guidance for between-visit maintenance",
      "Custom care instructions for your specific setup",
    ],
    note: "For the absolute best quality water and happy aquatic life, you will need to supplement our bi-weekly service with thorough maintenance between visits. Please use our detailed instruction guide we left with you for the appropriate way to keep perfect parameters. Please contact us immediately if you need assistance.",
  },
  {
    name: "Woody's Weekly Maintenance",
    freq: "52 Visits / Year",
    tagline: "Our all-inclusive weekly aquarium maintenance service provides complete peace of mind for busy aquarium owners.",
    includes: [
      "Professional water quality testing and adjustment",
      "Complete system inspection and cleaning",
      "Filter maintenance and media replacement",
      "Substrate vacuuming and debris removal",
      "Algae control and glass cleaning",
      "Equipment check and optimization",
      "Detailed water chemistry reports",
      "Everything except daily feeding",
    ],
    note: null,
  },
];

export default function MaintenancePage() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-ocean-950">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-12">
            <p className="text-xs tracking-[0.25em] uppercase font-medium text-blue-accent mb-2">
              Services
            </p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Aquarium Maintenance
            </h1>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl border border-white/10 bg-ocean-900 p-8 flex flex-col"
              >
                <div className="mb-6">
                  <p className="text-xs tracking-[0.2em] uppercase text-blue-accent font-medium mb-2">
                    {plan.freq}
                  </p>
                  <h2 className="text-xl font-bold text-white mb-3">
                    {plan.name}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {plan.tagline}
                  </p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs tracking-[0.15em] uppercase text-slate-500 font-medium mb-3">
                    This includes
                  </p>
                  <ul className="space-y-2">
                    {plan.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-accent flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.note && (
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-white/10 pt-4">
                    * {plan.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
