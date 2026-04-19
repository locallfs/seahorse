"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, {
        firstName,
        lastName,
        phone,
        address1,
        city,
        province,
        postalCode,
        countryCode: "us",
      });

      if (emailConsent) {
        fetch("/api/klaviyo-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName }),
        }).catch(() => {});
      }

      router.push("/account");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-base text-white placeholder:text-white focus:outline-none focus:border-blue-accent transition-colors";
  const labelClass = "block text-xs text-white mb-1.5 tracking-wide";

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">
            Create Account
          </h1>
          <p className="text-white text-sm text-center mb-8">
            Save your address once and check out faster next time.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="John"
                />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={inputClass}
                placeholder="(503) 555-0100"
              />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                required
                className={inputClass}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Portland"
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="OR"
                />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="97201"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/15 bg-ocean-800 text-blue-accent focus:ring-blue-accent focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-white leading-relaxed">
                I agree to receive emails from Woody&apos;s Seahorse Aquarium &amp; Supply
                including order updates, promotions, and care tips. You can
                unsubscribe at any time.
              </span>
            </label>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-accent hover:bg-blue-light text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-white text-sm text-center mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-blue-light transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
