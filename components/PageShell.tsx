import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageShellProps {
  title: string;
  subtitle: string;
  accentColor?: string;
  children?: React.ReactNode;
}

export default function PageShell({
  title,
  subtitle,
  accentColor = "#0ea5e9",
  children,
}: PageShellProps) {
  return (
    <>
      <Header />
      <main className="pt-24 min-h-screen">
        <div className="border-b border-white/10 bg-ocean-900">
          <div className="max-w-screen-xl mx-auto px-6 py-16">
            <p
              className="text-xs tracking-[0.25em] uppercase font-medium mb-3"
              style={{ color: accentColor }}
            >
              {subtitle}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="bg-ocean-950">
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            {children ?? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <div className="w-2 h-2 rounded-full bg-blue-accent animate-pulse" />
                  </div>
                  <p className="text-slate-400 text-sm">
                    Products loading soon — check back shortly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
