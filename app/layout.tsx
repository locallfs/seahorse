import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import StructuredData from "@/components/StructuredData";
import CookieConsent from "@/components/CookieConsent";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.seahorseaquariumsupply.com"),
  title: {
    default: "Woody's Seahorse Aquarium & Supply — Portland, OR",
    template: "%s — Woody's Seahorse Aquarium & Supply",
  },
  description:
    "Pacific Northwest's premier saltwater fish, coral, and aquarium supply store in Portland, OR. Shop live WYSIWYG fish and corals, invertebrates, reef equipment. Est. 1996.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Woody's Seahorse Aquarium & Supply",
    url: "https://www.seahorseaquariumsupply.com",
    images: [
      {
        url: "/images/LogoFullNameOnly.png",
        width: 1200,
        height: 630,
        alt: "Woody's Seahorse Aquarium & Supply",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (sessionStorage.getItem('splash_shown') !== '1') {
              document.documentElement.classList.add('splash-active');
            }
          } catch (e) {
            document.documentElement.classList.add('splash-active');
          }
        `}} />
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white antialiased">
        <AuthProvider>
          <CartProvider>
            <SplashScreen />
            {children}
            <ChatWidget />
          </CartProvider>
        </AuthProvider>
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
        <CookieConsent />
      </body>
    </html>
  );
}
