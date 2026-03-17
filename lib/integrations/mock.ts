/**
 * Mock data generator for development/testing.
 * Produces realistic trade data without hitting real APIs.
 */

import type { NormalizedTrade } from "./types";

const INSTRUMENTS = ["ES", "NQ", "RTY", "YM", "CL", "GC", "EURUSD", "GBPUSD"] as const;

const BASE_PRICES: Record<string, number> = {
  ES: 5200, NQ: 18200, RTY: 2050, YM: 42000,
  CL: 78, GC: 2050, EURUSD: 1.085, GBPUSD: 1.265,
};

const MULTIPLIERS: Record<string, number> = {
  ES: 50, NQ: 20, RTY: 50, YM: 5,
  CL: 1000, GC: 100, EURUSD: 100000, GBPUSD: 100000,
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function randItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockTrade(overrides?: Partial<NormalizedTrade>): NormalizedTrade {
  const instrument = randItem(INSTRUMENTS);
  const direction = Math.random() > 0.5 ? "long" : ("short" as const);
  const isWin = Math.random() > 0.42;

  const base = BASE_PRICES[instrument];
  const mult = MULTIPLIERS[instrument];
  const entry = base * (1 + (Math.random() - 0.5) * 0.01);
  const movePct = isWin ? rand(0.003, 0.025) : rand(0.001, 0.015);
  const delta = entry * movePct;

  const exit =
    direction === "long"
      ? isWin ? entry + delta : entry - delta
      : isWin ? entry - delta : entry + delta;

  const qty = randInt(1, 5);
  const rawPnl = (exit - entry) * qty * mult * (direction === "long" ? 1 : -1);
  const pnl = Math.round(rawPnl * 100) / 100;
  const pnlPercent = Math.round((pnl / (entry * qty * mult)) * 100000) / 1000;

  const durationMins = randInt(2, 240);
  const entryTime = new Date(Date.now() - rand(0, 86400000 * 7));
  const exitTime = new Date(entryTime.getTime() + durationMins * 60000);

  const closeReason: "tp" | "sl" | "manual" =
    isWin
      ? Math.random() > 0.2 ? "tp" : "manual"
      : Math.random() > 0.2 ? "sl" : "manual";

  return {
    externalId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    instrument,
    direction,
    entryPrice: Math.round(entry * 10000) / 10000,
    exitPrice: Math.round(exit * 10000) / 10000,
    quantity: qty,
    pnl,
    pnlPercent,
    entryTime,
    exitTime,
    closeReason,
    ...overrides,
  };
}

export function generateMockTrades(count: number, overrides?: Partial<NormalizedTrade>): NormalizedTrade[] {
  return Array.from({ length: count }, () => generateMockTrade(overrides));
}
