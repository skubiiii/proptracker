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
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
          <footer className="border-t border-[var(--card-border)] py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[var(--muted)]">
              PropTracker — Closed trades only. No copy trading. Past performance ≠ future results.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
