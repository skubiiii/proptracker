interface Trade {
  id: string;
  instrument: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: string;
  exitTime: string;
  closeReason: string;
  trader?: {
    slug: string;
    displayName: string;
    isVerified: boolean;
  };
}

function formatPnl(pnl: number) {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}$${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(entry: string, exit: string) {
  const mins = Math.round((new Date(exit).getTime() - new Date(entry).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CLOSE_REASON_LABELS: Record<string, string> = {
  tp: "TP",
  sl: "SL",
  manual: "Manual",
};

const CLOSE_REASON_COLORS: Record<string, string> = {
  tp: "text-green-400 bg-green-400/10",
  sl: "text-red-400 bg-red-400/10",
  manual: "text-yellow-400 bg-yellow-400/10",
};

export function TradeRow({ trade, showTrader }: { trade: Trade; showTrader?: boolean }) {
  const isWin = trade.pnl >= 0;

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center py-3 px-4 border-b border-[var(--card-border)] hover:bg-white/[0.02] transition-colors text-sm">
      {/* Instrument + Direction */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-bold ${
            trade.direction === "long"
              ? "bg-green-400/10 text-green-400"
              : "bg-red-400/10 text-red-400"
          }`}
        >
          {trade.direction === "long" ? "▲ LONG" : "▼ SHORT"}
        </span>
        <span className="font-mono font-semibold text-white">{trade.instrument}</span>
      </div>

      {/* Trader (optional) */}
      {showTrader && trade.trader ? (
        <div className="text-[var(--muted)] text-xs">
          <a
            href={`/trader/${trade.trader.slug}`}
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            {trade.trader.displayName}
            {trade.trader.isVerified && (
              <span className="text-blue-400">✓</span>
            )}
          </a>
        </div>
      ) : (
        <div />
      )}

      {/* Entry / Exit */}
      <div className="text-[var(--muted)] font-mono text-xs">
        <div>{trade.entryPrice.toLocaleString()}</div>
        <div className="text-[10px] opacity-60">entry</div>
      </div>
      <div className="text-[var(--muted)] font-mono text-xs">
        <div>{trade.exitPrice.toLocaleString()}</div>
        <div className="text-[10px] opacity-60">exit</div>
      </div>

      {/* Duration */}
      <div className="text-[var(--muted)] text-xs">
        {formatDuration(trade.entryTime, trade.exitTime)}
      </div>

      {/* Close reason */}
      <div>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            CLOSE_REASON_COLORS[trade.closeReason] ?? "text-gray-400 bg-gray-400/10"
          }`}
        >
          {CLOSE_REASON_LABELS[trade.closeReason] ?? trade.closeReason}
        </span>
      </div>

      {/* P&L */}
      <div className={`font-mono font-bold text-sm text-right ${isWin ? "pnl-positive" : "pnl-negative"}`}>
        <div>{formatPnl(trade.pnl)}</div>
        <div className="text-[10px] font-normal opacity-70">
          {trade.pnlPercent >= 0 ? "+" : ""}
          {trade.pnlPercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
