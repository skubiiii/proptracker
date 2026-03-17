"use client";

import { useEffect, useState } from "react";

interface VerificationRequest {
  id: string;
  status: string;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  trader: {
    displayName: string;
    slug: string;
    avatarUrl: string | null;
  };
}

export default function AdminPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  async function fetchRequests() {
    setLoading(true);
    const res = await fetch("/api/admin/verification-requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleAction(id: string, action: "approve" | "deny", adminNote?: string) {
    setProcessing(id);
    await fetch(`/api/admin/verification-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote }),
    });
    await fetchRequests();
    setProcessing(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-white">Verification Requests</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-10 text-center text-[var(--muted)]">No pending requests.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {r.trader.avatarUrl
                    ? <img src={r.trader.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : r.trader.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{r.trader.displayName}</span>
                    <a href={`/trader/${r.trader.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                      /trader/{r.trader.slug}
                    </a>
                  </div>
                  {r.message && (
                    <p className="text-sm text-[var(--muted)] mb-2">{r.message}</p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    Submitted {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(r.id, "approve")}
                    disabled={processing === r.id}
                    className="btn-primary text-xs !py-1.5 !px-3 disabled:opacity-50"
                  >
                    {processing === r.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "deny")}
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
  );
}
