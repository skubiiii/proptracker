import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PropTracker — Prop Firm Trader Leaderboard",
  description:
    "Track real prop firm trader performance. Closed trades only. No copy trading.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Animated background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(168,85,247,0.08) 0%, transparent 70%), #030712",
            }}
          />
          {/* Blob 1 — top-left indigo */}
          <div
            className="absolute rounded-full opacity-30"
            style={{
              width: 700,
              height: 700,
              top: -250,
              left: -250,
              background:
                "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
              animation: "blob-move 22s ease-in-out infinite",
              filter: "blur(60px)",
            }}
          />
          {/* Blob 2 — bottom-right purple */}
          <div
            className="absolute rounded-full opacity-25"
            style={{
              width: 600,
              height: 600,
              bottom: -200,
              right: -200,
              background:
                "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)",
              animation: "blob-move-2 28s ease-in-out infinite",
              filter: "blur(70px)",
            }}
          />
          {/* Blob 3 — center-right teal accent */}
          <div
            className="absolute rounded-full opacity-15"
            style={{
              width: 400,
              height: 400,
              top: "40%",
              right: "15%",
              background:
                "radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)",
              animation: "float 18s ease-in-out infinite",
              filter: "blur(50px)",
            }}
          />
        </div>

        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
          <footer className="mt-24 py-10 border-t border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[var(--muted)]">
              <p className="mb-1 font-semibold text-white/50">PropTracker</p>
              <p>Closed trades only. No copy trading. Past performance ≠ future results.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
