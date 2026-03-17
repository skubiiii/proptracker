"use client";

import { useEffect } from "react";

export interface TradeDetail {
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
  connectedAccount: { propFirm: { name: string } };
}

interface Props {
  trade: TradeDetail | null;
  onClose: () => void;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(entry: string, exit: string) {
  const ms = new Date(exit).getTime() - new Date(entry).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TradeDetailModal({ trade, onClose }: Props) {
  useEffect(() => {
    if (!trade) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trade, onClose]);

  if (!trade) return null;

  const pnlPos = trade.pnl >= 0;
  const pnlColor = pnlPos ? "text-green-400" : "text-red-400";
  const isLong = trade.direction === "long";

  const rows: { label: string; value: string }[] = [
    { label: "Account", value: trade.connectedAccount.propFirm.name },
    { label: "Direction", value: trade.direction.toUpperCase() },
    { label: "Entry Price", value: fmt(trade.entryPrice, 4) },
    { label: "Exit Price", value: fmt(trade.exitPrice, 4) },
    { label: "Quantity", value: fmt(trade.quantity, 2) },
    { label: "Entry Time", value: fmtDate(trade.entryTime) },
    { label: "Exit Time", value: fmtDate(trade.exitTime) },
    { label: "Duration", value: durationLabel(trade.entryTime, trade.exitTime) },
    { label: "Close Reason", value: trade.closeReason },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isLong ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
              }`}>
                {trade.direction.toUpperCase()}
              </span>
              <span className="text-lg font-bold text-white">{trade.instrument}</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${pnlColor}`}>
              {pnlPos ? "+" : ""}${fmt(trade.pnl)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {pnlPos ? "+" : ""}{fmt(trade.pnlPercent)}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Details grid */}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{r.label}</span>
              <span className="text-white font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
