"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-[var(--card-border)] bg-[var(--card)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-[var(--accent)]">⬡</span>
          <span>PropTracker</span>
        </Link>

        <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
          <Link href="/leaderboard" className="hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link href="/trades" className="hover:text-white transition-colors">
            Live Feed
          </Link>
          <Link href="/firms" className="hover:text-white transition-colors">
            Prop Firms
          </Link>

          {status === "loading" ? null : session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 transition-colors rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold">
                  {session.user.name?.[0]?.toUpperCase() ?? "T"}
                </span>
                <span>{session.user.name}</span>
                <span className="text-[var(--muted)]">▾</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 card shadow-xl rounded-lg overflow-hidden z-50"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/[0.05] transition-colors text-white"
                  >
                    Dashboard
                  </Link>
                  {session.user.traderSlug && (
                    <Link
                      href={`/trader/${session.user.traderSlug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/[0.05] transition-colors text-white"
                    >
                      Public Profile
                    </Link>
                  )}
                  <div className="border-t border-[var(--card-border)]" />
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-white/[0.05] transition-colors text-[var(--muted)]"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
