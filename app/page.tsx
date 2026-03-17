export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TraderCard } from "@/components/TraderCard";

async function getTopTraders() {
  return prisma.trader.findMany({
    take: 5,
    include: {
      stats: true,
      connectedAccounts: { include: { propFirm: true }, take: 1 },
    },
    orderBy: { stats: { totalPnl: "desc" } },
  });
}

async function getRecentTrades() {
  return prisma.closedTrade.findMany({
    take: 6,
    orderBy: { exitTime: "desc" },
    include: { trader: { select: { displayName: true, slug: true } } },
  });
}

async function getPlatformStats() {
  const [traderCount, tradeCount] = await Promise.all([
    prisma.trader.count(),
    prisma.closedTrade.count(),
  ]);
  return { traderCount, tradeCount };
}

export default async function HomePage() {
  const [topTraders, recentTrades, platformStats] = await Promise.all([
    getTopTraders(),
    getRecentTrades(),
    getPlatformStats(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
          Closed trades only — no copy trading
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Track Real Prop Firm
          <br />
          <span className="text-[var(--accent)]">Trader Performance</span>
        </h1>
        <p className="text-[var(--muted)] text-lg max-w-xl mx-auto mb-8">
          KOLscan for futures &amp; FX prop traders. Verified performance data shown only after
          trades close. No speculation, no signals.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/leaderboard"
            className="bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            View Leaderboard
          </Link>
          <Link
            href="/trades"
            className="border border-[var(--card-border)] hover:border-[var(--accent)]/40 text-[var(--foreground)] px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Live Trade Feed
          </Link>
        </div>
      </div>

      {/* Platform stats */}
      <div className="flex justify-center gap-4 mb-16">
        {[
          { label: "Verified Traders", value: platformStats.traderCount },
          { label: "Closed Trades Logged", value: platformStats.tradeCount.toLocaleString() },
          { label: "Prop Firms", value: 5 },
        ].map((s) => (
          <div key={s.label} className="card px-8 py-4 text-center">
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top leaderboard preview */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Top Traders — All Time</h2>
          <Link href="/leaderboard" className="text-sm text-[var(--accent)] hover:underline">
            Full leaderboard →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {topTraders.map((trader, i) => (
            <TraderCard
              key={trader.id}
              rank={i + 1}
              slug={trader.slug}
              displayName={trader.displayName}
              isVerified={trader.isVerified}
              avatarUrl={trader.avatarUrl}
              propFirm={trader.connectedAccounts[0]?.propFirm ?? null}
              stats={trader.stats}
            />
          ))}
        </div>
      </div>

      {/* Recent trades preview */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Closed Trades</h2>
          <Link href="/trades" className="text-sm text-[var(--accent)] hover:underline">
            View feed →
          </Link>
        </div>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--card-border)]">
            <span>Trader</span>
            <span>Instrument</span>
            <span>Direction</span>
            <span>Close</span>
            <span className="text-right min-w-[80px]">P&amp;L</span>
          </div>
          {recentTrades.map((trade) => {
            const isWin = trade.pnl >= 0;
            return (
              <div
                key={trade.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm border-b border-[var(--card-border)] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <a href={`/trader/${trade.trader.slug}`} className="text-[var(--accent)] hover:underline truncate text-sm">
                  {trade.trader.displayName}
                </a>
                <span className="font-mono font-semibold text-white">{trade.instrument}</span>
                <span className={`text-xs font-bold ${trade.direction === "long" ? "text-green-400" : "text-red-400"}`}>
                  {trade.direction === "long" ? "▲ LONG" : "▼ SHORT"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded w-fit h-fit ${
                  trade.closeReason === "tp" ? "text-green-400 bg-green-400/10"
                  : trade.closeReason === "sl" ? "text-red-400 bg-red-400/10"
                  : "text-yellow-400 bg-yellow-400/10"
                }`}>
                  {trade.closeReason.toUpperCase()}
                </span>
                <span className={`font-mono font-bold text-right min-w-[80px] ${isWin ? "pnl-positive" : "pnl-negative"}`}>
                  {isWin ? "+" : ""}${Math.abs(trade.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: "🔒", title: "Closed Trades Only", desc: "Performance data surfaced only after TP or SL hit. Zero forward-looking data." },
          { icon: "✓", title: "Verified Accounts", desc: "Prop firm accounts connected directly via API — no manual trade logging." },
          { icon: "📊", title: "Deep Analytics", desc: "Win rate, avg R:R, max drawdown, consistency score, and full trade history." },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <div className="font-semibold text-white mb-1">{f.title}</div>
            <div className="text-sm text-[var(--muted)]">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
