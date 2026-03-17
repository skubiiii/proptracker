"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { ConnectAccountModal } from "@/components/ConnectAccountModal";
import { EquityCurve } from "@/components/EquityCurve";
import { TradeDetailModal, type TradeDetail } from "@/components/TradeDetailModal";
import { VerificationRequestButton } from "@/components/VerificationRequestButton";

interface Account {
  id: string;
  propFirmName: string;
  propFirmSlug: string;
  platform: string;
  accountIdentifier: string;
  accountType: "funded" | "evaluation" | "unknown";
  status: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  pnl: number;
  tradeCount: number;
  winRate: number;
  tokenExpired: boolean;
}

interface Stats {
  totalPnl: number;
  fundedPnl: number;
  hasFunded: boolean;
  totalTrades: number;
  winRate: number;
  avgRr: number;
  followerCount: number;
  accounts: Account[];
}

interface CurvePoint {
  date: string;
  value: number;
}

interface ProfileData {
  displayName: string | null;
  bio: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  telegramUrl: string | null;
  slug: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

interface VerifyStatus {
  isVerified: boolean;
  request: { status: string } | null;
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

function fmtWinRate(r: number) {
  // API stores as 0-100 from traderStats, but per-account is already 0-100
  return `${r.toFixed(1)}%`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<TradeDetail[]>([]);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeDetail | null>(null);
  const [togglingType, setTogglingType] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<ProfileData>>({});
  const [expiredBannerDismissed, setExpiredBannerDismissed] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, tradesRes, curveRes, profileRes, verifyRes] = await Promise.all([
      fetch("/api/dashboard/stats"),
      fetch("/api/dashboard/trades?limit=20"),
      fetch("/api/dashboard/equity-curve"),
      fetch("/api/dashboard/profile"),
      fetch("/api/dashboard/verify"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (tradesRes.ok) {
      const d = await tradesRes.json();
      setTrades(d.trades ?? []);
    }
    if (curveRes.ok) {
      const d = await curveRes.json();
      setCurvePoints(d.points ?? []);
    }
    if (profileRes.ok) {
      const p = await profileRes.json();
      setProfile(p);
      setProfileForm(p);
    }
    if (verifyRes.ok) {
      setVerifyStatus(await verifyRes.json());
    }
    setLoading(false);
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File exceeds 2MB limit.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setAvatarError("Invalid file type.");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/dashboard/avatar", { method: "POST", body: form });
    if (res.ok) {
      const { avatarUrl } = await res.json();
      setProfile((prev) => prev ? { ...prev, avatarUrl } : prev);
    } else {
      const err = await res.json().catch(() => ({}));
      setAvatarError(err.error ?? "Upload failed.");
      setAvatarPreview(null);
    }
    setAvatarUploading(false);
  }

  async function handleAvatarRemove() {
    setAvatarUploading(true);
    await fetch("/api/dashboard/avatar", { method: "DELETE" });
    setAvatarPreview(null);
    setProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev);
    setAvatarUploading(false);
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/sync", { method: "POST" });
    await fetchData();
    setSyncing(false);
  }

  async function handleToggleType(accId: string, current: string) {
    const next = current === "funded" ? "evaluation" : current === "evaluation" ? "unknown" : "funded";
    setTogglingType(accId);
    await fetch(`/api/dashboard/accounts/${accId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountType: next }),
    });
    await fetchData();
    setTogglingType(null);
  }

  async function handleProfileSave() {
    setProfileSaving(true);
    const res = await fetch("/api/dashboard/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setProfileForm(updated);
      setProfileOpen(false);
    }
    setProfileSaving(false);
  }

  const pnlColor = (stats?.totalPnl ?? 0) >= 0 ? "text-green-400" : "text-red-400";
  const expiredAccounts = stats?.accounts.filter((a) => a.tokenExpired) ?? [];
  const hasExpired = expiredAccounts.length > 0 && !expiredBannerDismissed;
  const noAccounts = !loading && (stats?.accounts.length ?? 0) === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Expired token banner */}
      {hasExpired && (
        <div className="mb-6 flex items-center justify-between bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-sm px-4 py-3 rounded-lg">
          <span>
            ⚠ Tradovate token expired for{" "}
            {expiredAccounts.map((a) => a.propFirmName).join(", ")} — reconnect to resume syncing.
          </span>
          <button
            onClick={() => setExpiredBannerDismissed(true)}
            className="ml-4 text-yellow-400/60 hover:text-yellow-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {session?.user?.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {verifyStatus && (
            <VerificationRequestButton
              initialIsVerified={verifyStatus.isVerified}
              initialStatus={verifyStatus.request?.status ?? null}
            />
          )}
          <button
            onClick={() => setProfileOpen(true)}
            className="btn-ghost text-xs !py-1.5 !px-3"
          >
            Edit Profile
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-ghost text-xs !py-1.5 !px-3 disabled:opacity-50"
          >
            <span className={syncing ? "animate-spin inline-block" : ""}>↻</span>
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Onboarding empty state */}
      {noAccounts && (
        <div className="card p-10 text-center mb-8">
          <p className="text-4xl mb-4">🚀</p>
          <h2 className="text-xl font-bold text-white mb-2">Connect your first account</h2>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-sm mx-auto">
            Link a PropFirm account to start tracking your cumulative P&amp;L, win rate, and trade history.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-sm"
          >
            + Connect Account
          </button>
        </div>
      )}

      {/* Cumulative P&L hero + equity curve */}
      {!noAccounts && (
        <div className="card p-6 mb-6">
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1 text-center">
            {stats?.hasFunded ? "Funded Accounts P&L" : "Cumulative P&L — All Accounts"}
          </p>
          {loading ? (
            <div className="h-12 w-48 bg-white/[0.04] rounded-lg animate-pulse mx-auto mb-4" />
          ) : (
            <p className={`text-5xl font-bold tabular-nums text-center mb-4 ${pnlColor}`}>
              {fmtLarge(stats?.totalPnl ?? 0)}
            </p>
          )}
          {curvePoints.length >= 2 && (
            <div className="mt-2">
              <EquityCurve points={curvePoints} />
            </div>
          )}
          {!loading && curvePoints.length < 2 && (
            <p className="text-xs text-[var(--muted)] text-center">Equity curve will appear once you have trades.</p>
          )}
        </div>
      )}

      {/* Stats row */}
      {!noAccounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Trades", value: loading ? "—" : String(stats?.totalTrades ?? 0) },
            { label: "Win Rate", value: loading ? "—" : fmtWinRate(stats?.winRate ?? 0) },
            { label: "Avg R:R", value: loading ? "—" : (stats?.avgRr ?? 0).toFixed(2) },
            { label: "Followers", value: loading ? "—" : String(stats?.followerCount ?? 0) },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-xs text-[var(--muted)] mb-1">{s.label}</p>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Connected Accounts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Connected Accounts
          </h2>
          {!noAccounts && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary text-xs !py-1.5 !px-3"
            >
              <span>+</span> Connect Account
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : !noAccounts ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats?.accounts.map((acc) => {
              const typeCfg = {
                funded:     { label: "Funded",     cls: "bg-green-400/10 text-green-400 border-green-400/20" },
                evaluation: { label: "Evaluation", cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
                unknown:    { label: "Unknown",    cls: "bg-white/[0.06] text-[var(--muted)] border-white/[0.08]" },
              }[acc.accountType] ?? { label: "Unknown", cls: "bg-white/[0.06] text-[var(--muted)] border-white/[0.08]" };

              return (
                <div
                  key={acc.id}
                  className={`card p-5 ${acc.tokenExpired ? "border-yellow-400/30" : acc.accountType === "funded" ? "border-green-400/10" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{acc.propFirmName}</p>
                      <p className="text-[10px] text-[var(--muted)] uppercase mt-0.5">{acc.platform}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {acc.tokenExpired && (
                        <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-medium">
                          token expired
                        </span>
                      )}
                      {/* Account type badge — click to cycle */}
                      <button
                        onClick={() => handleToggleType(acc.id, acc.accountType)}
                        disabled={togglingType === acc.id}
                        title="Click to change account type"
                        className={`text-[10px] border px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70 disabled:opacity-40 cursor-pointer ${typeCfg.cls}`}
                      >
                        {togglingType === acc.id ? "..." : typeCfg.label}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-3 truncate">{acc.accountIdentifier}</p>
                  <p className={`text-xl font-bold tabular-nums mb-2 ${acc.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmt(acc.pnl)}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                    <span>{acc.tradeCount} trades</span>
                    <span className="text-white/20">·</span>
                    <span>{fmtWinRate(acc.winRate)} WR</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Recent Trades */}
      {!noAccounts && (
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
              No trades recorded yet. Sync your accounts to pull trades.
            </div>
          ) : (
            <div className="card divide-y divide-[var(--card-border)]">
              {trades.map((trade) => {
                const isLong = trade.direction === "long";
                const pnlPos = trade.pnl >= 0;
                return (
                  <button
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                    className="w-full flex items-center px-4 py-3 gap-4 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isLong ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                    }`}>
                      {trade.direction.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-white flex-1">{trade.instrument}</span>
                    <span className="text-xs text-[var(--muted)] hidden sm:block">
                      {trade.connectedAccount.propFirm.name}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(trade.exitTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                      {pnlPos ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Editor Modal */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Edit Profile</h2>
              <button onClick={() => setProfileOpen(false)} className="text-[var(--muted)] hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Avatar upload */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--muted)] mb-2">Avatar</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white text-xl font-bold">
                  {(avatarPreview ?? profile?.avatarUrl)
                    ? <img src={avatarPreview ?? profile?.avatarUrl ?? ""} alt="" className="w-full h-full object-cover" />
                    : (profile?.displayName?.charAt(0).toUpperCase() ?? "?")}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="btn-ghost text-xs !py-1 !px-3 disabled:opacity-50"
                  >
                    {avatarUploading ? "Uploading..." : "Upload Photo"}
                  </button>
                  {(profile?.avatarUrl || avatarPreview) && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={avatarUploading}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                  {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: "displayName", label: "Display Name", placeholder: "Your name" },
                { key: "bio", label: "Bio", placeholder: "Short bio..." },
                { key: "twitterUrl", label: "Twitter / X URL", placeholder: "https://x.com/..." },
                { key: "youtubeUrl", label: "YouTube URL", placeholder: "https://youtube.com/..." },
                { key: "tiktokUrl", label: "TikTok URL", placeholder: "https://tiktok.com/..." },
                { key: "telegramUrl", label: "Telegram URL", placeholder: "https://t.me/..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-[var(--muted)] mb-1">{label}</label>
                  <input
                    type="text"
                    value={(profileForm as Record<string, string>)[key] ?? ""}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="glass-input"
                  />
                </div>
              ))}
            </div>

            {profile?.slug && (
              <p className="text-xs text-[var(--muted)] mt-4">
                Public profile:{" "}
                <a
                  href={`/trader/${profile.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  /trader/{profile.slug}
                </a>
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setProfileOpen(false)}
                className="btn-ghost flex-1 text-sm !py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="btn-primary flex-1 text-sm !py-2"
              >
                {profileSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConnectAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); fetchData(); }}
      />

      <TradeDetailModal
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}
