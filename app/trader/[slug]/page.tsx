export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { TradeRow } from "@/components/TradeRow";

async function getTrader(slug: string) {
  return prisma.trader.findUnique({
    where: { slug },
    include: {
      stats: true,
      connectedAccounts: { include: { propFirm: true }, where: { status: "active" } },
    },
  });
}

async function getTrades(traderId: string) {
  return prisma.closedTrade.findMany({
    where: { traderId },
    orderBy: { exitTime: "desc" },
    take: 50,
  });
}

function formatPnl(pnl: number, prefix = true) {
  const sign = pnl >= 0 ? "+" : "-";
  const abs = Math.abs(pnl);
  const str = abs >= 1000
    ? abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2);
  return prefix ? `${sign}$${str}` : `$${str}`;
}

export default async function TraderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [trader, trades] = await Promise.all([
    getTrader(slug),
    getTrader(slug).then((t) => (t ? getTrades(t.id) : [])),
  ]);

  if (!trader) notFound();

  const s = trader.stats;
  const firm = trader.connectedAccounts[0]?.propFirm;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="card p-6 mb-6 flex items-start gap-6">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
          {trader.avatarUrl
            ? <img src={trader.avatarUrl} alt={trader.displayName} className="w-full h-full object-cover" />
            : trader.displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">{trader.displayName}</h1>
            {trader.isVerified && <span className="badge-verified">✓ Verified</span>}
          </div>
          {trader.bio && <p className="text-[var(--muted)] text-sm mb-3">{trader.bio}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {firm && (
              <a href={`/firms`} className="text-xs text-[var(--muted)] bg-[var(--card-border)] px-2 py-1 rounded hover:text-white transition-colors">
                {firm.name} · {firm.infrastructure.toUpperCase()}
              </a>
            )}
            {trader.twitterUrl && (
              <a href={trader.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                𝕏 Twitter
              </a>
            )}
            {trader.youtubeUrl && (
              <a href={trader.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline">
                ▶ YouTube
              </a>
            )}
            {trader.tiktokUrl && (
              <a href={trader.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-400 hover:underline">
                ♪ TikTok
              </a>
            )}
            {trader.telegramUrl && (
              <a href={trader.telegramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">
                ✈ Telegram
              </a>
            )}
          </div>
        </div>

        {/* Total P&L callout */}
        {s && (
          <div className="text-right">
            <div className="text-xs text-[var(--muted)] mb-1">Total P&amp;L</div>
            <div className={`text-3xl font-bold ${s.totalPnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
              {formatPnl(s.totalPnl)}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">{s.totalTrades} trades</div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Win Rate" value={`${s.winRate.toFixed(1)}%`} positive={s.winRate >= 55} negative={s.winRate < 45} />
          <StatCard label="Avg R:R" value={s.avgRr.toFixed(2)} positive={s.avgRr >= 1.5} negative={s.avgRr < 1} />
          <StatCard label="Best Trade" value={formatPnl(s.bestTrade)} positive />
          <StatCard label="Worst Trade" value={formatPnl(s.worstTrade)} negative={s.worstTrade < 0} />
          <StatCard label="Max Drawdown" value={`$${s.maxDrawdown.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} negative={s.maxDrawdown > 5000} />
          <StatCard label="Avg Duration" value={`${s.avgTradeDurationMinutes < 60 ? `${Math.round(s.avgTradeDurationMinutes)}m` : `${(s.avgTradeDurationMinutes / 60).toFixed(1)}h`}`} />
          <StatCard label="Consistency" value={`${s.consistencyScore.toFixed(0)}/100`} positive={s.consistencyScore >= 65} negative={s.consistencyScore < 45} />
          <StatCard label="Followers" value={s.followerCount >= 1000 ? `${(s.followerCount / 1000).toFixed(1)}k` : s.followerCount} />
        </div>
      )}

      {/* Trade history */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Closed Trade History</h2>
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--card-border)]">
            <span className="min-w-[120px]">Instrument</span>
            <div />
            <span>Entry</span>
            <span>Exit</span>
            <span>Duration</span>
            <span>Close</span>
            <span className="text-right">P&amp;L</span>
          </div>
          {trades.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">No trades found.</div>
          ) : (
            trades.map((trade) => (
              <TradeRow
                key={trade.id}
                trade={{
                  ...trade,
                  entryTime: trade.entryTime.toISOString(),
                  exitTime: trade.exitTime.toISOString(),
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
