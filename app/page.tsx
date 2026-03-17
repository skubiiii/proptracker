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
    <div className="max-w-7xl mx-auto px-4 py-16">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="text-center mb-20 animate-fade-up">
        {/* Live pill */}
        <div className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-8 border border-white/[0.08]"
          style={{ background: "rgba(129,140,248,0.08)" }}>
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block"
            style={{ boxShadow: "0 0 8px var(--accent-glow)", animation: "float 2s ease-in-out infinite" }}
          />
          <span className="text-[var(--accent)]">Live — Closed trades only</span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl sm:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Track Real{" "}
          <span className="text-gradient">Prop Firm</span>
          <br />
          Trader Performance
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-[var(--muted)] max-w-lg mx-auto mb-10 leading-relaxed">
          KOLscan for futures &amp; FX prop traders. Verified performance data
          surfaced only after trades close. No speculation, no signals.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/leaderboard" className="btn-primary text-sm !px-7 !py-3">
            View Leaderboard →
          </Link>
          <Link href="/register" className="btn-ghost text-sm !px-7 !py-3">
            Start Tracking Free
          </Link>
        </div>
      </div>

      {/* ── Platform Stats ────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-4 mb-20 animate-fade-up-2">
        {[
          { label: "Verified Traders", value: platformStats.traderCount, suffix: "" },
          { label: "Closed Trades", value: platformStats.tradeCount.toLocaleString(), suffix: "" },
          { label: "Prop Firms Supported", value: "5", suffix: "" },
          { label: "Data Latency", value: "~1h", suffix: "" },
        ].map((s) => (
          <div
            key={s.label}
            className="card px-8 py-5 text-center min-w-[130px] flex-1"
            style={{ maxWidth: 200 }}
          >
            <div className="text-3xl font-black text-white mb-1">{s.value}{s.suffix}</div>
            <div className="text-xs text-[var(--muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Top Leaderboard Preview ───────────────────────────────────── */}
      <div className="mb-20 animate-fade-up-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">Top Traders</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">All-time by realized P&L</p>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs text-[var(--accent)] hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
          >
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

      {/* ── Recent Trades Feed ────────────────────────────────────────── */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Closed Trades</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Live feed across all traders</p>
          </div>
          <Link
            href="/trades"
            className="text-xs text-[var(--accent)] hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
          >
            View feed →
          </Link>
        </div>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs text-[var(--muted)] border-b border-white/[0.06] uppercase tracking-wider">
            <span>Trader</span>
            <span>Instrument</span>
            <span>Direction</span>
            <span>Close</span>
            <span className="text-right min-w-[90px]">P&amp;L</span>
          </div>
          {recentTrades.map((trade) => {
            const isWin = trade.pnl >= 0;
            const isLong = trade.direction === "long";
            return (
              <div
                key={trade.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 text-sm border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025] transition-colors"
              >
                <a
                  href={`/trader/${trade.trader.slug}`}
                  className="text-[var(--accent)] hover:text-white transition-colors truncate"
                >
                  {trade.trader.displayName}
                </a>
                <span className="font-mono font-bold text-white">{trade.instrument}</span>
                <span
                  className={`text-xs font-bold ${isLong ? "text-[var(--green)]" : "text-[var(--red)]"}`}
                >
                  {isLong ? "▲ LONG" : "▼ SHORT"}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md w-fit h-fit font-medium ${
                    trade.closeReason === "tp"
                      ? "text-[var(--green)] bg-[var(--green)]/10"
                      : trade.closeReason === "sl"
                      ? "text-[var(--red)] bg-[var(--red)]/10"
                      : "text-yellow-400 bg-yellow-400/10"
                  }`}
                >
                  {trade.closeReason.toUpperCase()}
                </span>
                <span
                  className={`font-mono font-bold text-right min-w-[90px] ${
                    isWin ? "pnl-positive" : "pnl-negative"
                  }`}
                >
                  {isWin ? "+" : "-"}$
                  {Math.abs(trade.pnl).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Feature Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          {
            icon: "🔒",
            title: "Closed Trades Only",
            desc: "Performance surfaced only after TP or SL hits. Zero forward-looking data.",
            glow: "rgba(99,102,241,0.15)",
          },
          {
            icon: "✓",
            title: "Verified Accounts",
            desc: "Prop firm accounts connected via direct API — no manual trade logging.",
            glow: "rgba(52,211,153,0.12)",
          },
          {
            icon: "📊",
            title: "Deep Analytics",
            desc: "Win rate, avg R:R, max drawdown, consistency score, and full trade history.",
            glow: "rgba(168,85,247,0.15)",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="card p-7 group"
            style={{ boxShadow: `0 0 40px ${f.glow}` }}
          >
            <div
              className="text-3xl mb-4 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {f.icon}
            </div>
            <div className="font-semibold text-white mb-2 group-hover:text-gradient transition-all">
              {f.title}
            </div>
            <div className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
