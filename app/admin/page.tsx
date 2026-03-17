"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  userCount: number;
  traderCount: number;
  tradeCount: number;
  verifiedCount: number;
  pendingVerifications: number;
  totalPnl: number;
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
  trader: { slug: string; displayName: string; isVerified: boolean } | null;
}

interface AdminTrader {
  id: string;
  displayName: string;
  slug: string;
  isVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  user: { email: string } | null;
  stats: { totalTrades: number; totalPnl: number; winRate: number; followerCount: number } | null;
  verificationRequest: { status: string } | null;
}

interface VerificationRequest {
  id: string;
  status: string;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  trader: { displayName: string; slug: string; avatarUrl: string | null };
}

type Tab = "overview" | "users" | "traders" | "verification";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 8 }: { url: string | null; name: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-xs`;
  return (
    <div className={cls}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-[var(--muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  );
}

function fmt(n: number) {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [traders, setTraders] = useState<AdminTrader[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "user" | "trader"; id: string; name: string } | null>(null);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  const loadTraders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/traders");
    if (res.ok) setTraders(await res.json());
    setLoading(false);
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/verification-requests");
    if (res.ok) setVerifications(await res.json());
    setLoading(false);
  }, []);

  // Load stats on mount and when switching to overview
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (tab === "users") loadUsers();
    else if (tab === "traders") loadTraders();
    else if (tab === "verification") loadVerifications();
  }, [tab, loadUsers, loadTraders, loadVerifications]);

  async function handleRoleChange(userId: string, newRole: string) {
    setProcessing(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setProcessing(null);
  }

  async function handleDeleteUser(userId: string) {
    setProcessing(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirmDelete(null);
    setProcessing(null);
    loadStats();
  }

  async function handleToggleVerified(traderId: string, current: boolean) {
    setProcessing(traderId);
    const res = await fetch(`/api/admin/traders/${traderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !current }),
    });
    if (res.ok) {
      setTraders((prev) => prev.map((t) => t.id === traderId ? { ...t, isVerified: !current } : t));
    }
    setProcessing(null);
    loadStats();
  }

  async function handleDeleteTrader(traderId: string) {
    setProcessing(traderId);
    await fetch(`/api/admin/traders/${traderId}`, { method: "DELETE" });
    setTraders((prev) => prev.filter((t) => t.id !== traderId));
    setConfirmDelete(null);
    setProcessing(null);
    loadStats();
  }

  async function handleVerification(id: string, action: "approve" | "deny") {
    setProcessing(id);
    await fetch(`/api/admin/verification-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setVerifications((prev) => prev.filter((r) => r.id !== id));
    setProcessing(null);
    loadStats();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "traders", label: "Traders" },
    { key: "verification", label: `Verification${stats?.pendingVerifications ? ` (${stats.pendingVerifications})` : ""}` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-white">Control Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--card-border)]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-[var(--muted)] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div>
          {!stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="card h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Users" value={stats.userCount} />
              <StatCard label="Total Traders" value={stats.traderCount} />
              <StatCard label="Total Trades" value={stats.tradeCount.toLocaleString()} />
              <StatCard label="Verified Traders" value={stats.verifiedCount} sub={`${((stats.verifiedCount / stats.traderCount) * 100 || 0).toFixed(0)}% of traders`} />
              <StatCard label="Pending Verifications" value={stats.pendingVerifications} />
              <StatCard
                label="Platform P&L"
                value={fmt(stats.totalPnl)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-xs text-[var(--muted)] border-b border-[var(--card-border)]">
                <span className="w-8" />
                <span>User</span>
                <span className="w-20 text-center">Role</span>
                <span className="w-28 text-right">Joined</span>
                <span className="w-16" />
              </div>
              {users.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center border-b border-[var(--card-border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <Avatar url={u.avatarUrl} name={u.username} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.username}</p>
                    <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
                    {u.trader && (
                      <a href={`/trader/${u.trader.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                        /trader/{u.trader.slug}
                      </a>
                    )}
                  </div>
                  <div className="w-20 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={processing === u.id}
                      className="glass-input text-xs !py-0.5 !px-2 w-full text-center cursor-pointer"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <span className="text-xs text-[var(--muted)] w-28 text-right">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                  </span>
                  <div className="w-16 flex justify-end">
                    <button
                      onClick={() => setConfirmDelete({ type: "user", id: u.id, name: u.username })}
                      disabled={processing === u.id}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30"
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Traders ── */}
      {tab === "traders" && (
        <div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 text-xs text-[var(--muted)] border-b border-[var(--card-border)]">
                <span className="w-8" />
                <span>Trader</span>
                <span className="w-20 text-right">Trades</span>
                <span className="w-24 text-right">P&L</span>
                <span className="w-20 text-center">Verified</span>
                <span className="w-16" />
              </div>
              {traders.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center border-b border-[var(--card-border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <Avatar url={t.avatarUrl} name={t.displayName} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.displayName}</p>
                    <a href={`/trader/${t.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                      /trader/{t.slug}
                    </a>
                    {t.user && <p className="text-xs text-[var(--muted)] truncate">{t.user.email}</p>}
                  </div>
                  <span className="text-sm text-white w-20 text-right">{t.stats?.totalTrades ?? 0}</span>
                  <span className={`text-sm font-medium w-24 text-right tabular-nums ${(t.stats?.totalPnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmt(t.stats?.totalPnl ?? 0)}
                  </span>
                  <div className="w-20 flex justify-center">
                    <button
                      onClick={() => handleToggleVerified(t.id, t.isVerified)}
                      disabled={processing === t.id}
                      title={t.isVerified ? "Revoke verification" : "Manually verify"}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all disabled:opacity-40 ${
                        t.isVerified
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-red-400/10 hover:border-red-400/30 hover:text-red-400"
                          : "bg-white/[0.04] border-white/10 text-[var(--muted)] hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400"
                      }`}
                    >
                      {processing === t.id ? "..." : t.isVerified ? "✓ Verified" : "Unverified"}
                    </button>
                  </div>
                  <div className="w-16 flex justify-end">
                    <button
                      onClick={() => setConfirmDelete({ type: "trader", id: t.id, name: t.displayName })}
                      disabled={processing === t.id}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30"
                      title="Delete trader"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Verification ── */}
      {tab === "verification" && (
        <div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
          ) : verifications.length === 0 ? (
            <div className="card p-12 text-center text-[var(--muted)]">No pending verification requests.</div>
          ) : (
            <div className="space-y-3">
              {verifications.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start gap-4">
                    <Avatar url={r.trader.avatarUrl} name={r.trader.displayName} size={10} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{r.trader.displayName}</span>
                        <a href={`/trader/${r.trader.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                          /trader/{r.trader.slug}
                        </a>
                      </div>
                      {r.message && <p className="text-sm text-[var(--muted)] mb-2 leading-relaxed">{r.message}</p>}
                      <p className="text-xs text-[var(--muted)]">
                        Submitted {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleVerification(r.id, "approve")}
                        disabled={processing === r.id}
                        className="btn-primary text-xs !py-1.5 !px-3 disabled:opacity-50"
                      >
                        {processing === r.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleVerification(r.id, "deny")}
                        disabled={processing === r.id}
                        className="btn-ghost text-xs !py-1.5 !px-3 disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-white mb-2">Delete {confirmDelete.type}?</h2>
            <p className="text-sm text-[var(--muted)] mb-5">
              This will permanently delete <span className="text-white font-medium">{confirmDelete.name}</span>
              {confirmDelete.type === "user" ? " and all their data." : " and all their trades."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 text-sm !py-2">
                Cancel
              </button>
              <button
                onClick={() =>
                  confirmDelete.type === "user"
                    ? handleDeleteUser(confirmDelete.id)
                    : handleDeleteTrader(confirmDelete.id)
                }
                disabled={processing === confirmDelete.id}
                className="flex-1 text-sm !py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-all font-medium disabled:opacity-50"
              >
                {processing === confirmDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
