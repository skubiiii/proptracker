"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{
        background: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base group">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
            style={{
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              boxShadow: "0 0 16px rgba(99,102,241,0.45)",
            }}
          >
            P
          </span>
          <span className="text-white/90 group-hover:text-white transition-colors">PropTracker</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 text-sm">
          {[
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/trades", label: "Live Feed" },
            { href: "/firms", label: "Firms" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-[var(--muted)] hover:text-white hover:bg-white/[0.06] transition-all duration-150"
            >
              {label}
            </Link>
          ))}

          <div className="w-px h-4 bg-white/10 mx-1" />

          {status === "loading" ? null : session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 hover:bg-white/[0.06] transition-all rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #818cf8, #6366f1)",
                    boxShadow: "0 0 10px rgba(99,102,241,0.4)",
                  }}
                >
                  {session.user.name?.[0]?.toUpperCase() ?? "T"}
                </span>
                <span className="text-white/80">{session.user.name}</span>
                <span className="text-white/30 text-[10px]">▾</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50 border border-white/[0.08]"
                  style={{
                    background: "rgba(10, 12, 28, 0.92)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
                  }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-xs hover:bg-white/[0.06] transition-colors text-white/80 hover:text-white"
                  >
                    <span className="opacity-60">⬛</span> Dashboard
                  </Link>
                  {(session.user as any).role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-xs hover:bg-white/[0.06] transition-colors text-indigo-400 hover:text-indigo-300"
                    >
                      <span className="opacity-60">⚙</span> Admin Panel
                    </Link>
                  )}
                  {session.user.traderSlug && (
                    <Link
                      href={`/trader/${session.user.traderSlug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-xs hover:bg-white/[0.06] transition-colors text-white/80 hover:text-white"
                    >
                      <span className="opacity-60">👤</span> Public Profile
                    </Link>
                  )}
                  <div className="border-t border-white/[0.06]" />
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-3 text-xs hover:bg-white/[0.06] transition-colors text-[var(--muted)] hover:text-white"
                  >
                    <span className="opacity-60">↩</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-primary text-xs !py-1.5 !px-4"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
