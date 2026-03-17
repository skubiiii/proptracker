export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

const INFRA_LABELS: Record<string, string> = {
  rithmic: "Rithmic",
  tradovate: "Tradovate",
  projectx: "ProjectX",
  mt4: "MT4",
  mt5: "MT5",
};

const INFRA_COLORS: Record<string, string> = {
  rithmic: "text-orange-400 bg-orange-400/10",
  tradovate: "text-blue-400 bg-blue-400/10",
  projectx: "text-purple-400 bg-purple-400/10",
  mt4: "text-green-400 bg-green-400/10",
  mt5: "text-teal-400 bg-teal-400/10",
};

async function getFirms() {
  return prisma.propFirm.findMany({
    include: {
      connectedAccounts: {
        where: { status: "active" },
        include: {
          trader: {
            include: { stats: true },
          },
        },
      },
    },
  });
}

export default async function FirmsPage() {
  const firms = await getFirms();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Prop Firms Directory</h1>
        <p className="text-[var(--muted)]">
          Supported prop trading firms and their tracked traders.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {firms.map((firm) => {
          const traders = firm.connectedAccounts.map((a) => a.trader);
          const totalPnl = traders.reduce((s, t) => s + (t.stats?.totalPnl ?? 0), 0);
          const avgWinRate =
            traders.length > 0
              ? traders.reduce((s, t) => s + (t.stats?.winRate ?? 0), 0) / traders.length
              : 0;

          return (
            <div key={firm.id} className="card p-6">
              {/* Firm header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{firm.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        INFRA_COLORS[firm.infrastructure] ?? "text-gray-400 bg-gray-400/10"
                      }`}
                    >
                      {INFRA_LABELS[firm.infrastructure] ?? firm.infrastructure}
                    </span>
                  </div>
                  {firm.websiteUrl && (
                    <a
                      href={firm.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      {firm.websiteUrl.replace("https://", "")} ↗
                    </a>
                  )}
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-xs text-[var(--muted)]">Tracked Traders</div>
                    <div className="text-lg font-bold text-white">{traders.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted)]">Avg Win Rate</div>
                    <div className="text-lg font-bold text-white">{avgWinRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted)]">Total P&amp;L</div>
                    <div className={`text-lg font-bold ${totalPnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
                      {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>
              </div>

              {/* Traders */}
              {traders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {traders.map((t) => (
                    <Link
                      key={t.id}
                      href={`/trader/${t.slug}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-[var(--card-border)]"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {t.displayName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-white truncate">{t.displayName}</span>
                          {t.isVerified && <span className="text-blue-400 text-xs">✓</span>}
                        </div>
                        {t.stats && (
                          <div className="text-xs text-[var(--muted)]">
                            {t.stats.winRate.toFixed(0)}% WR · {t.stats.totalTrades} trades
                          </div>
                        )}
                      </div>
                      {t.stats && (
                        <div className={`text-xs font-mono font-bold ${t.stats.totalPnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
                          {t.stats.totalPnl >= 0 ? "+" : "-"}${(Math.abs(t.stats.totalPnl) / 1000).toFixed(1)}k
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">No active traders connected.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
