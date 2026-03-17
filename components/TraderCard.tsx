import Link from "next/link";

interface TraderCardProps {
  rank: number;
  slug: string;
  displayName: string;
  isVerified: boolean;
  avatarUrl?: string | null;
  propFirm?: { name: string; slug: string } | null;
  stats?: {
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    avgRr: number;
    followerCount: number;
  } | null;
  periodPnl?: number;
}

function formatPnl(pnl: number) {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? "+" : "-";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export function TraderCard({
  rank,
  slug,
  displayName,
  isVerified,
  avatarUrl,
  propFirm,
  stats,
  periodPnl,
}: TraderCardProps) {
  const pnl = periodPnl ?? stats?.totalPnl ?? 0;
  const isPositive = pnl >= 0;

  return (
    <Link href={`/trader/${slug}`}>
      <div className="card p-4 hover:border-[var(--accent)]/40 transition-colors cursor-pointer flex items-center gap-4">
        {/* Rank */}
        <div
          className={`text-2xl font-bold w-8 text-center ${
            RANK_COLORS[rank - 1] ?? "text-[var(--muted)]"
          }`}
        >
          {rank}
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white truncate">{displayName}</span>
            {isVerified && (
              <span className="badge-verified">✓ Verified</span>
            )}
          </div>
          {propFirm && (
            <div className="text-xs text-[var(--muted)] mt-0.5">{propFirm.name}</div>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">Win Rate</div>
            <div className="font-semibold text-white">{stats?.winRate.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">Avg R:R</div>
            <div className="font-semibold text-white">{stats?.avgRr.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">Trades</div>
            <div className="font-semibold text-white">{stats?.totalTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[var(--muted)]">Followers</div>
            <div className="font-semibold text-white">
              {stats?.followerCount
                ? stats.followerCount >= 1000
                  ? `${(stats.followerCount / 1000).toFixed(1)}k`
                  : stats.followerCount
                : "—"}
            </div>
          </div>
        </div>

        {/* P&L */}
        <div className={`text-right ml-2 font-mono font-bold text-lg ${isPositive ? "pnl-positive" : "pnl-negative"}`}>
          {formatPnl(pnl)}
        </div>
      </div>
    </Link>
  );
}
