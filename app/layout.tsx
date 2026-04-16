import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Woody's Seahorse Aquarium & Supply",
  description:
    "Premium saltwater fish, coral, and aquarium supplies. Est. 1996. Shop live fish, invertebrates, WYSIWYG corals, and professional aquarium services.",
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
          if (!sessionStorage.getItem('splash_shown')) {
            document.documentElement.classList.add('splash-active');
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-black text-slate-100 antialiased">
        <AuthProvider>
          <CartProvider>
            <SplashScreen />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
