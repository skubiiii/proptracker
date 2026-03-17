"use client";

import { useEffect, useState } from "react";
import { TraderCard } from "@/components/TraderCard";

type Period = "daily" | "weekly" | "monthly" | "all";

interface LeaderboardEntry {
  rank: number;
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  propFirm: { name: string; slug: string } | null;
  stats: {
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    avgRr: number;
    followerCount: number;
  } | null;
  periodPnl: number;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: "All Time", value: "all" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        setTraders(data);
        setLoading(false);
      });
  }, [period]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-[var(--muted)]">
          Ranked by closed-trade P&amp;L. Verified prop firm accounts only.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[50px_1fr_auto] gap-4 px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--card-border)] mb-1">
        <span>#</span>
        <span>Trader</span>
        <span className="text-right pr-2">P&amp;L</span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse opacity-40" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {traders.map((trader) => (
            <TraderCard
              key={trader.id}
              rank={trader.rank}
              slug={trader.slug}
              displayName={trader.displayName}
              isVerified={trader.isVerified}
              avatarUrl={trader.avatarUrl}
              propFirm={trader.propFirm}
              stats={trader.stats}
              periodPnl={period !== "all" ? trader.periodPnl : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
