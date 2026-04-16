"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
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
            Sign In
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Sign in to view your orders and account details
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full bg-ocean-800 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-accent transition-colors"
                placeholder="Your password"
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-slate-400 text-sm text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-white hover:text-blue-light transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
