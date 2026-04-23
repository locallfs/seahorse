import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Woody's Seahorse Aquarium & Supply — governing your use of our website, store, and mobile app.",
  alternates: { canonical: "/terms" },
};

const lastUpdated = "April 23, 2026";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-16">
            <p className="text-sm md:text-base tracking-[0.25em] uppercase font-medium text-[#FFD700] mb-3">
              Legal
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-white/70 text-sm mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 space-y-10 text-white leading-relaxed text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Agreement</h2>
            <p>
              By accessing seahorseaquariumsupply.com, the ReefNerds mobile
              app, or the physical store at 106 NE Russet St., Portland, OR
              97211 (the &ldquo;Services&rdquo;), you agree to these Terms of
              Service. The Services are operated by Secret Reef LLC (d/b/a
              Woody&apos;s Seahorse Aquarium &amp; Supply). If you do not
              agree, please do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old to place an order or create an
              account. By placing an order you represent that the information
              you provide is accurate and that you are authorized to use the
              payment method submitted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              3. Product listings and pricing
            </h2>
            <p>
              We make every effort to show accurate descriptions, images, and
              prices. Occasional errors can occur. We reserve the right to
              correct errors, change prices at any time, and cancel or refund
              orders where a listing was incorrect. Product availability is
              not guaranteed until the order ships.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              4. Orders and payment
            </h2>
            <p className="mb-3">
              All orders are subject to acceptance by us. Payment is processed
              by Stripe; your card details are never stored on our servers. We
              may place an authorization hold on your card at order placement
              or, for auction winners, when an auction ends.
            </p>
            <p>
              Applicable taxes and shipping fees are added at checkout. Orders
              with addresses that fail verification may be held or cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              5. Shipping and returns
            </h2>
            <p>
              Our full Shipping &amp; Returns policy &mdash; including our
              live arrival guarantee &mdash; is available at{" "}
              <a
                href="/shipping-returns"
                className="text-[#FFD700] hover:underline"
              >
                /shipping-returns
              </a>
              . That policy is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              6. Live animal care
            </h2>
            <p>
              Livestock requires proper husbandry. Once an animal has been
              acclimated to your system, its continued health is your
              responsibility. We cannot guarantee animals against loss due to
              incompatible tankmates, poor water quality, equipment failure,
              or inadequate care. See our{" "}
              <a href="/care" className="text-[#FFD700] hover:underline">
                care guide
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              7. Accounts and security
            </h2>
            <p>
              You are responsible for keeping your account credentials
              confidential and for all activity under your account. Notify us
              immediately at{" "}
              <a
                href="mailto:info@seahorseaquariumsupply.com"
                className="text-[#FFD700] hover:underline"
              >
                info@seahorseaquariumsupply.com
              </a>{" "}
              if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              8. Acceptable use
            </h2>
            <p>
              You agree not to (a) use the Services for any unlawful purpose;
              (b) attempt to probe, scan, or test the vulnerability of our
              systems; (c) use automated scrapers or bots without permission;
              or (d) submit false, deceptive, or fraudulent information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              9. Intellectual property
            </h2>
            <p>
              All content on the Services &mdash; including product
              photography, logos, site copy, and the Woody&apos;s Seahorse
              name and marks &mdash; is owned by Secret Reef LLC or its
              licensors and is protected by copyright and trademark law. You
              may not reproduce, distribute, or create derivative works
              without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              10. Disclaimer of warranties
            </h2>
            <p>
              The Services are provided &ldquo;as is&rdquo; without
              warranties of any kind, express or implied, including
              merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant uninterrupted or
              error-free access to the Services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              11. Limitation of liability
            </h2>
            <p>
              To the fullest extent allowed by law, Secret Reef LLC&apos;s
              total liability arising out of the Services is limited to the
              amount you paid for the specific product or service giving rise
              to the claim. We are not liable for indirect, incidental, or
              consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              12. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of the State of Oregon,
              without regard to conflict-of-law principles. Any dispute will
              be resolved in the state or federal courts located in
              Multnomah County, Oregon.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              13. Changes to these Terms
            </h2>
            <p>
              We may update these Terms from time to time. The &ldquo;Last
              updated&rdquo; date will reflect the most recent change. Your
              continued use of the Services after an update constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">14. Contact</h2>
            <p>
              Questions about these Terms? Email{" "}
              <a
                href="mailto:info@seahorseaquariumsupply.com"
                className="text-[#FFD700] hover:underline"
              >
                info@seahorseaquariumsupply.com
              </a>{" "}
              or call 503-283-4788.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Secret Reef LLC<br />
              106 NE Russet St.<br />
              Portland, OR 97211
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
