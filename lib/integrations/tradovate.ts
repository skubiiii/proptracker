/**
 * Tradovate OAuth2 Integration
 * Auth: https://trader.tradovate.com/oauth → code → token exchange
 * API base: https://live.tradovateapi.com/v1
 */

const API_BASE = "https://live.tradovateapi.com/v1";

// Value per point for common futures products (used to calculate P&L)
const VALUE_PER_POINT: Record<string, number> = {
  ES: 50, NQ: 20, YM: 5, RTY: 50,
  CL: 1000, GC: 100, SI: 5000, HG: 25000,
  ZB: 1000, ZN: 1000, ZF: 1000,
  MES: 5, MNQ: 2, MYM: 0.5, M2K: 5, MCL: 100, MGC: 10,
  NG: 10000, RB: 42000, HO: 42000,
};

export interface TradovateTokenResponse {
  accessToken: string;
  expirationTime: string; // ISO string, ~90 min from now
  userId: number;
  name: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  active: boolean;
}

export interface TradovateFillPair {
  id: number;
  buyFillId: number;
  sellFillId: number;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  contractId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
}

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
  active: boolean;
}

export interface TradovateContract {
  id: number;
  name: string;       // e.g. "ESH6"
  status: string;
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

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TRADOVATE_CLIENT_ID!,
    redirect_uri: getTradovateRedirectUri(),
    state,
  });
  return `https://trader.tradovate.com/oauth?${params.toString()}`;
}

export function getTradovateRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/api/auth/tradovate/callback`;
}

export async function exchangeCodeForToken(code: string): Promise<TradovateTokenResponse> {
  const res = await fetch("https://live.tradovateapi.com/auth/oauthtoken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.TRADOVATE_CLIENT_ID,
      client_secret: process.env.TRADOVATE_CLIENT_SECRET,
      redirect_uri: getTradovateRedirectUri(),
      code,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.accessToken) {
    throw new Error(data.errorText ?? `Token exchange failed (${res.status})`);
  }
  return data;
}

export async function renewToken(token: string): Promise<TradovateTokenResponse> {
  const res = await fetch(`${API_BASE}/auth/renewaccesstoken`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data.accessToken) {
    throw new Error("Token renewal failed");
  }
  return data;
}

export async function getAccounts(token: string): Promise<TradovateAccount[]> {
  const res = await fetch(`${API_BASE}/account/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch accounts (${res.status})`);
  return res.json();
}

export async function getFillPairs(token: string): Promise<TradovateFillPair[]> {
  const res = await fetch(`${API_BASE}/fillPair/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch fill pairs (${res.status})`);
  return res.json();
}

export async function getFills(token: string): Promise<TradovateFill[]> {
  const res = await fetch(`${API_BASE}/fill/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch fills (${res.status})`);
  return res.json();
}

export async function getContracts(token: string): Promise<TradovateContract[]> {
  const res = await fetch(`${API_BASE}/contract/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch contracts (${res.status})`);
  return res.json();
}

function parseProductSymbol(contractName: string): string {
  // "ESH6" → "ES", "MESM5" → "MES", "CLZ5" → "CL"
  return contractName.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, "");
}

export function mapFillPairsToTrades(
  fillPairs: TradovateFillPair[],
  fills: TradovateFill[],
  contracts: TradovateContract[]
): MappedTrade[] {
  const fillMap = new Map(fills.map((f) => [f.id, f]));
  const contractMap = new Map(contracts.map((c) => [c.id, c]));

  return fillPairs.map((fp) => {
    const buyFill = fillMap.get(fp.buyFillId);
    const sellFill = fillMap.get(fp.sellFillId);
    const contract = contractMap.get(fp.contractId);
    const instrument = contract ? parseProductSymbol(contract.name) : String(fp.contractId);

    // Direction: if buy fill came before sell fill → long trade
    const buyTime = buyFill ? new Date(buyFill.timestamp) : new Date(fp.timestamp);
    const sellTime = sellFill ? new Date(sellFill.timestamp) : new Date(fp.timestamp);
    const direction: "long" | "short" = buyTime <= sellTime ? "long" : "short";

    const entryPrice = direction === "long" ? fp.buyPrice : fp.sellPrice;
    const exitPrice = direction === "long" ? fp.sellPrice : fp.buyPrice;
    const entryTime = direction === "long" ? buyTime : sellTime;
    const exitTime = direction === "long" ? sellTime : buyTime;

    const valuePerPoint = VALUE_PER_POINT[instrument] ?? 1;
    const pnl =
      direction === "long"
        ? (fp.sellPrice - fp.buyPrice) * fp.qty * valuePerPoint
        : (fp.buyPrice - fp.sellPrice) * fp.qty * valuePerPoint;

    const pnlPercent = entryPrice > 0 ? (pnl / (entryPrice * fp.qty)) * 100 : 0;

    return {
      externalId: `tv-fp-${fp.id}`,
      instrument,
      direction,
      entryPrice,
      exitPrice,
      quantity: fp.qty,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      entryTime,
      exitTime,
      closeReason: "market",
    };
  });
}
