import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Woody's Seahorse Aquarium & Supply collects, uses, and protects your personal information on our website and in the ReefNerds mobile app.",
  alternates: { canonical: "/privacy" },
};

const lastUpdated = "April 21, 2026";

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-white/70 text-sm mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 space-y-10 text-white leading-relaxed text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Who we are</h2>
            <p>
              This privacy policy describes how Secret Reef LLC (&ldquo;Woody&apos;s
              Seahorse Aquarium &amp; Supply,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us&rdquo;) handles personal information collected through
              seahorseaquariumsupply.com, the ReefNerds mobile app, and in our
              retail store at 106 NE Russet St., Portland, OR 97211.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              What we collect
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Account info:</strong> name, email, password (stored
                hashed, never in plain text).
              </li>
              <li>
                <strong>Order info:</strong> shipping and billing addresses,
                phone, items purchased, order history.
              </li>
              <li>
                <strong>Payment info:</strong> card details are entered directly
                into Stripe and never touch our servers. We store only a token
                and the last four digits for reorder and auction use.
              </li>
              <li>
                <strong>Communication:</strong> messages you send through our
                contact and quote forms, and your email if you opt in to
                marketing.
              </li>
              <li>
                <strong>Device &amp; usage info:</strong> IP address, browser
                and OS version, approximate location derived from IP, and pages
                viewed &mdash; for security, analytics, and fraud prevention.
              </li>
              <li>
                <strong>Photos:</strong> if you use the ReefNerds app&apos;s
                camera or photo library features, the photo is attached to the
                specific item you&apos;re referencing. We never scan or sell
                your photos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              How we use your info
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>To process orders, ship livestock and supplies, and handle returns.</li>
              <li>To run live auctions, including placing a hold on your saved card once you are the winning bidder.</li>
              <li>To send order, shipping, auction, and account emails through Klaviyo.</li>
              <li>To send optional marketing emails (you can unsubscribe at any time).</li>
              <li>To improve the site and app and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Who we share with
            </h2>
            <p className="mb-3">
              We do not sell your personal information. We share the minimum
              necessary with these service providers who process data on our
              behalf:
            </p>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Stripe</strong> &mdash; payment processing. Card details
                go directly to Stripe.
              </li>
              <li>
                <strong>Medusa (self-hosted on Railway)</strong> &mdash; our
                e-commerce backend storing orders, customers, and product data.
              </li>
              <li>
                <strong>Klaviyo</strong> &mdash; transactional and marketing
                email delivery.
              </li>
              <li>
                <strong>Shippo</strong> &mdash; shipping rate calculation and
                label generation.
              </li>
              <li>
                <strong>Bunny.net</strong> &mdash; image and file hosting.
              </li>
              <li>
                <strong>Google Maps</strong> &mdash; address autocomplete and
                the store-locator map.
              </li>
              <li>
                <strong>QuickBooks</strong> &mdash; accounting sync for
                completed orders (order totals and items, not card details).
              </li>
            </ul>
            <p className="mt-3">
              We may also disclose information if required by law or to protect
              our rights, property, or safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Your choices
            </h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>
                <strong>Access or correct your info:</strong> sign in to your
                account and update it directly.
              </li>
              <li>
                <strong>Delete your account:</strong> email{" "}
                <a
                  href="mailto:info@seahorseaquariumsupply.com"
                  className="text-[#FFD700] hover:underline"
                >
                  info@seahorseaquariumsupply.com
                </a>{" "}
                with the subject line &ldquo;Delete my account.&rdquo; We will
                permanently remove your personal data within 30 days, retaining
                only records we are legally required to keep (e.g.
                tax-related order history).
              </li>
              <li>
                <strong>Unsubscribe from marketing:</strong> click the
                unsubscribe link at the bottom of any marketing email.
              </li>
              <li>
                <strong>Remove a saved card:</strong> visit{" "}
                <span className="font-mono text-sm">/account/payment-methods</span>{" "}
                when signed in.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Children&apos;s privacy
            </h2>
            <p>
              Our site and app are not directed at children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided us with personal information,
              email us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Security</h2>
            <p>
              We use TLS for all data in transit, store passwords using salted
              one-way hashing, and restrict access to customer data to
              authorized staff only. No system is perfectly secure, so we also
              recommend you use a strong, unique password for your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Data retention</h2>
            <p>
              Account and order records are retained for as long as your
              account is active. If you request deletion, we remove identifying
              data within 30 days, except where retention is required by law
              (for example, tax and accounting records).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. The &ldquo;Last
              updated&rdquo; date at the top will reflect the latest change.
              Material changes will be announced by email or a prominent notice
              on the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about this policy or your data? Email us at{" "}
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
