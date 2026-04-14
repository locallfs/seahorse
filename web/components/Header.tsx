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
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
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

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-blue-dim hover:text-blue-accent transition-colors duration-200 rounded hover:bg-blue-accent/5 tracking-wide font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
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
          </nav>
        </div>
      )}
    </header>
  );
}
