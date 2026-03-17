"use client";

import { useEffect, useState, useCallback } from "react";
import { TradeRow } from "@/components/TradeRow";

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
  trader: {
    slug: string;
    displayName: string;
    isVerified: boolean;
  };
}

interface Pagination {
  page: number;
  total: number;
  pages: number;
}

export default function TradesFeedPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/trades/feed?page=${p}&limit=30`)
      .then((r) => r.json())
      .then((data) => {
        setTrades(data.trades);
        setPagination(data.pagination);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTrades(page);
  }, [page, fetchTrades]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Live Trade Feed</h1>
        <p className="text-[var(--muted)]">
          Most recently closed trades across all tracked traders.
        </p>
      </div>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--card-border)]">
          <span className="min-w-[120px]">Instrument</span>
          <span>Trader</span>
          <span>Entry</span>
          <span>Exit</span>
          <span>Duration</span>
          <span>Close</span>
          <span className="text-right">P&amp;L</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[var(--muted)]">Loading...</div>
        ) : trades.length === 0 ? (
          <div className="py-8 text-center text-[var(--muted)]">No trades found.</div>
        ) : (
          trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} showTrader />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-[var(--muted)]">
            {pagination.total} trades total
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded text-sm card border border-[var(--card-border)] disabled:opacity-30 hover:border-[var(--accent)]/40 transition-colors"
            >
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-[var(--muted)]">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-3 py-1.5 rounded text-sm card border border-[var(--card-border)] disabled:opacity-30 hover:border-[var(--accent)]/40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
