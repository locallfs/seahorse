"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartContext";

const navLinks = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Saltwater Fish", href: "/fish" },
  { label: "Inverts", href: "/inverts" },
  { label: "Corals", href: "/corals" },
  { label: "Supplies", href: "/supplies" },
  { label: "Maintenance", href: "/maintenance" },
  { label: "Installations", href: "/installations" },
  { label: "Who We Are", href: "/who-we-are" },
  { label: "Store", href: "/store" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-slate-200 ${
        scrolled ? "shadow-md shadow-black/10" : ""
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/logo.png"
            alt="Woody's Seahorse Aquarium & Supply"
            width={140}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-blue-dim hover:text-blue-accent transition-colors duration-200 tracking-wide font-medium whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <Link
            href="/cart"
            className="relative p-2 text-blue-dim hover:text-blue-accent transition-colors"
            aria-label="Cart"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v12a2 2 0 002 2h10a2 2 0 002-2V6l-3-4z" />
              <path d="M3 6h14" />
              <path d="M13 10a3 3 0 01-6 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <Link
            href="/store"
            className="px-5 py-2 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded transition-colors duration-200 tracking-wide"
          >
            Shop Now
          </Link>
          <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
            <a href="https://www.facebook.com/SeahorseAquariumSupply" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-1 text-blue-dim hover:text-blue-accent transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-1 text-blue-dim hover:text-blue-accent transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="p-1 text-blue-dim hover:text-blue-accent transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
              </svg>
            </a>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden flex flex-col gap-1.5 p-2 group"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-px w-6 bg-blue-dim transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block h-px w-6 bg-blue-dim transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-px w-6 bg-blue-dim transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200">
          <nav className="max-w-screen-xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-4 text-sm text-blue-dim hover:text-blue-accent hover:bg-blue-accent/5 rounded transition-colors duration-200 tracking-wide font-medium"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/store"
              onClick={() => setMenuOpen(false)}
              className="mt-3 py-3 px-4 text-sm font-medium bg-blue-accent hover:bg-blue-light text-white rounded text-center transition-colors duration-200"
            >
              Shop Now
            </Link>
            <div className="flex items-center gap-4 mt-3 px-4">
              <a href="https://www.facebook.com/SeahorseAquariumSupply" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-blue-dim hover:text-blue-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-blue-dim hover:text-blue-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="https://www.tiktok.com/@seahorseaquariumsupply" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-blue-dim hover:text-blue-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
                </svg>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
