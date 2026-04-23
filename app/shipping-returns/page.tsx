import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Shipping & Returns — Live Arrival Guarantee",
  description:
    "Shipping, returns, and the Woody's Seahorse live arrival guarantee. Priority overnight shipping for live animals, DOA refund process, and free shipping on orders over $500.",
  alternates: { canonical: "/shipping-returns" },
};

const lastUpdated = "April 23, 2026";

export default function ShippingReturnsPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-16">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Policy
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Shipping &amp; Returns
            </h1>
            <p className="text-white/70 text-sm mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 space-y-10 text-white leading-relaxed text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Shipping methods
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Live animals</strong> (fish, corals, inverts): UPS or
                FedEx Priority Overnight only. We do not ship live animals
                ground or two-day.
              </li>
              <li>
                <strong>Dry goods</strong> (equipment, supplies, salt mix):
                USPS, UPS, or FedEx ground, two-day, or overnight depending
                on carrier pricing.
              </li>
              <li>
                <strong>Free shipping</strong> on orders totaling $500 or
                more, applied automatically at checkout.
              </li>
              <li>
                <strong>Local pickup</strong> is available at 106 NE Russet
                St., Portland, OR 97211 during open hours.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Handling and ship dates
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                Live animal orders ship Monday through Wednesday to avoid
                weekend transit delays.
              </li>
              <li>
                Orders placed after 12:00 PM PT on Wednesday will ship the
                following Monday.
              </li>
              <li>
                We do not ship live animals the day before or on major
                holidays, or when origin/destination temperatures exceed safe
                thresholds. You will be notified by email of any hold.
              </li>
              <li>
                A handling fee is added at checkout: $7 for supplies-only
                orders, $12 for orders containing live animals.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Live arrival guarantee
            </h2>
            <p className="mb-3">
              Every live animal shipment is covered by our live arrival
              guarantee, provided the following conditions are met:
            </p>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                Someone is present at the delivery address to receive the
                package on the first delivery attempt.
              </li>
              <li>
                You open the package within two (2) hours of delivery and
                begin acclimation.
              </li>
              <li>
                You take clear, unaltered photos of any deceased animals
                inside the sealed shipping bag &mdash; before removing the
                animal from the bag.
              </li>
              <li>
                You email the photos and your order number to{" "}
                <a
                  href="mailto:info@seahorseaquariumsupply.com"
                  className="text-[#FFD700] hover:underline"
                >
                  info@seahorseaquariumsupply.com
                </a>{" "}
                within four (4) hours of delivery.
              </li>
            </ul>
            <p className="mt-3">
              Approved claims are refunded as store credit for the value of
              the affected animal(s). Shipping fees are non-refundable. The
              guarantee does not cover losses caused by carrier delays beyond
              our control after the first delivery attempt, missed delivery
              windows, or animals that die after successful acclimation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Dry goods returns
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                New, unused dry goods may be returned within 30 days of
                delivery for a refund to the original payment method.
              </li>
              <li>
                Items must be in original packaging with all accessories. A
                15% restocking fee applies to opened items.
              </li>
              <li>
                Return shipping is the customer&apos;s responsibility unless
                the item arrived defective or was shipped in error.
              </li>
              <li>
                Consumables (salt, media, food, supplements) are
                non-returnable once opened.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Live animal returns
            </h2>
            <p>
              Live animals are final sale and cannot be returned once
              delivered. We do not accept animal returns due to tank
              compatibility issues, changes of mind, or inadequate care.
              Claims are handled exclusively under the live arrival
              guarantee above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              How to start a return
            </h2>
            <p>
              Email{" "}
              <a
                href="mailto:info@seahorseaquariumsupply.com"
                className="text-[#FFD700] hover:underline"
              >
                info@seahorseaquariumsupply.com
              </a>{" "}
              with your order number and a brief description of the issue.
              We will reply within one business day with instructions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Questions?
            </h2>
            <p>
              Call us at 503-283-4788 during store hours, or email{" "}
              <a
                href="mailto:info@seahorseaquariumsupply.com"
                className="text-[#FFD700] hover:underline"
              >
                info@seahorseaquariumsupply.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
