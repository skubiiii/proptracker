"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ConnectAccountModal } from "@/components/ConnectAccountModal";

interface Account {
  id: string;
  propFirmName: string;
  propFirmSlug: string;
  platform: string;
  accountIdentifier: string;
  status: string;
  connectedAt: string;
  pnl: number;
}

interface Stats {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  avgRr: number;
  followerCount: number;
  accounts: Account[];
}

interface Trade {
  id: string;
  instrument: string;
  direction: string;
  pnl: number;
  pnlPercent: number;
  entryTime: string;
  exitTime: string;
  connectedAccount: { propFirm: { name: string } };
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtLarge(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, tradesRes] = await Promise.all([
      fetch("/api/dashboard/stats"),
      fetch("/api/dashboard/trades?limit=10"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (tradesRes.ok) {
      const d = await tradesRes.json();
      setTrades(d.trades ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/sync", { method: "POST" });
    await fetchData();
    setSyncing(false);
  }

  const pnlColor = (stats?.totalPnl ?? 0) >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {session?.user?.name}
          </h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 text-xs bg-white/[0.06] hover:bg-white/10 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors mt-1"
        >
          <span className={syncing ? "animate-spin" : ""}>↻</span>
          {syncing ? "Syncing..." : "Sync Trades"}
        </button>
      </div>

      {/* Cumulative P&L hero */}
      <div className="card p-8 mb-6 text-center">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-2">
          Cumulative P&L — All Accounts
        </p>
        {loading ? (
          <div className="h-12 w-48 bg-white/[0.04] rounded-lg animate-pulse mx-auto" />
        ) : (
          <p className={`text-5xl font-bold tabular-nums ${pnlColor}`}>
            {fmtLarge(stats?.totalPnl ?? 0)}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Trades", value: loading ? "—" : String(stats?.totalTrades ?? 0) },
          { label: "Win Rate", value: loading ? "—" : `${((stats?.winRate ?? 0) * 100).toFixed(1)}%` },
          { label: "Avg R:R", value: loading ? "—" : (stats?.avgRr ?? 0).toFixed(2) },
          { label: "Followers", value: loading ? "—" : String(stats?.followerCount ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs text-[var(--muted)] mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Connected Accounts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Connected Accounts
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white px-3 py-1.5 rounded-md transition-colors"
          >
            <span>+</span> Connect Account
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : stats?.accounts.length === 0 ? (
          <div className="card p-8 text-center text-[var(--muted)] text-sm">
            <p className="text-3xl mb-3">🔌</p>
            <p className="font-medium text-white mb-1">No accounts connected yet</p>
            <p>Connect a prop firm account to start tracking your P&L.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats?.accounts.map((acc) => (
              <div key={acc.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{acc.propFirmName}</p>
                    <p className="text-[10px] text-[var(--muted)] uppercase mt-0.5">{acc.platform}</p>
                  </div>
                  <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded font-medium">
                    {acc.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mb-2 truncate">{acc.accountIdentifier}</p>
                <p className={`text-xl font-bold tabular-nums ${acc.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(acc.pnl)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Recent Trades
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-12 animate-pulse" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--muted)]">
            No trades recorded yet.
          </div>
        ) : (
          <div className="card divide-y divide-[var(--card-border)]">
            {trades.map((trade) => {
              const isLong = trade.direction === "long";
              const pnlPos = trade.pnl >= 0;
              return (
                <div key={trade.id} className="flex items-center px-4 py-3 gap-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isLong ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                  }`}>
                    {trade.direction.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-white flex-1">{trade.instrument}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {trade.connectedAccount.propFirm.name}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                    {pnlPos ? "+" : ""}${trade.pnl.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConnectAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); fetchData(); }}
      />
    </div>
  );
}
