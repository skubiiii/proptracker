const BASE_URL = "https://gateway.topstepx.com/api";

export interface ProjectXAccount {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
}

export interface ProjectXFill {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  price: number;
  profitAndLoss: number | null;
  fees: number;
  side: number; // 0 = Buy, 1 = Sell
  size: number;
  voided: boolean;
  orderId: number;
}

export interface MappedTrade {
  externalId: string;
  instrument: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  exitTime: Date;
  closeReason: string;
}

export async function authenticate(userName: string, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/Auth/loginKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, apiKey }),
  });

  const data = await res.json();

  if (!data.success || !data.token) {
    throw new Error(data.errorMessage ?? "Authentication failed");
  }

  return data.token;
}

export async function getAccounts(token: string): Promise<ProjectXAccount[]> {
  const res = await fetch(`${BASE_URL}/Account/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ onlyActiveAccounts: true }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.errorMessage ?? "Failed to fetch accounts");
  }

  return data.accounts ?? [];
}

export async function getTrades(
  token: string,
  accountId: number,
  startTimestamp: Date,
  endTimestamp: Date
): Promise<ProjectXFill[]> {
  const res = await fetch(`${BASE_URL}/Trade/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      accountId,
      startTimestamp: startTimestamp.toISOString(),
      endTimestamp: endTimestamp.toISOString(),
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.errorMessage ?? "Failed to fetch trades");
  }

  return (data.trades ?? []).filter((t: ProjectXFill) => !t.voided);
}

// Parse contract ID like "CON.F.US.EP.H25" → "ES" (human readable)
function parseInstrument(contractId: string): string {
  const parts = contractId.split(".");
  // e.g. CON.F.US.EP.H25 → EP (4th segment)
  const symbol = parts[3] ?? parts[parts.length - 1];
  const monthCode = parts[4]?.charAt(0) ?? "";
  const year = parts[4]?.slice(1) ?? "";
  return `${symbol}${monthCode}${year}` || contractId;
}

// Group fills into round-trip trades by matching entry + exit fills
export function mapFillsToTrades(fills: ProjectXFill[]): MappedTrade[] {
  // Only process closing fills (those with P&L)
  const closingFills = fills.filter(
    (f) => f.profitAndLoss !== null && f.profitAndLoss !== undefined
  );

  const trades: MappedTrade[] = [];

  for (const close of closingFills) {
    // Find the matching entry fill — same contract, opposite side, before close time
    const entryFill = fills.find(
      (f) =>
        f.contractId === close.contractId &&
        f.side !== close.side &&
        f.profitAndLoss == null &&
        new Date(f.creationTimestamp) <= new Date(close.creationTimestamp)
    );

    const exitPrice = close.price;
    const entryPrice = entryFill?.price ?? close.price;
    const exitTime = new Date(close.creationTimestamp);
    const entryTime = entryFill ? new Date(entryFill.creationTimestamp) : exitTime;

    // side 1 = Sell to close = was Long; side 0 = Buy to close = was Short
    const direction: "long" | "short" = close.side === 1 ? "long" : "short";

    const pnl = close.profitAndLoss!;
    const pnlPercent = entryPrice > 0 ? (pnl / (entryPrice * close.size)) * 100 : 0;

    trades.push({
      externalId: String(close.id),
      instrument: parseInstrument(close.contractId),
      direction,
      entryPrice,
      exitPrice,
      quantity: close.size,
      pnl,
      pnlPercent,
      entryTime,
      exitTime,
      closeReason: "market",
    });
  }

  return trades;
}
