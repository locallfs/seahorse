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
      await register(email, password, firstName, lastName);
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">
            Create Account
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Create an account to track orders and check out faster
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                  placeholder="Smith"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-accent hover:bg-blue-light text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-slate-400 text-sm text-center mt-6">
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
