/**
 * Tradovate Integration
 *
 * Real implementation design:
 * 1. OAuth2 authorization flow → get access + refresh tokens
 * 2. REST API to backfill closed trades
 * 3. WebSocket (TradovateSubscriptionClient) to stream real-time position updates
 * 4. When position closes (fillPair or orderFill), normalize + persist to DB
 *
 * Reference: https://api.tradovate.com/ (v1 REST + WebSocket)
 */

import type {
  PropFirmAdapter,
  IntegrationCredentials,
  TradovateCredentials,
  NormalizedTrade,
  OAuth2Config,
  OAuth2TokenResponse,
} from "./types";
import { generateMockTrades } from "./mock";

// ─── OAuth2 Config ─────────────────────────────────────────────────────────────

const TRADOVATE_OAUTH_CONFIG: OAuth2Config = {
  clientId: process.env.TRADOVATE_CLIENT_ID ?? "",
  clientSecret: process.env.TRADOVATE_CLIENT_SECRET ?? "",
  authorizationUrl: "https://trader.tradovate.com/oauth/authorize",
  tokenUrl: "https://live-api.tradovate.com/v1/auth/oauthToken",
  redirectUri: process.env.TRADOVATE_REDIRECT_URI ?? "http://localhost:3000/api/auth/tradovate/callback",
  scopes: ["trading"],
};

const API_BASE = "https://live-api.tradovate.com/v1";
const DEMO_API_BASE = "https://demo-api.tradovate.com/v1";
const WS_URL = "wss://live-api.tradovate.com/v1/websocket";

// ─── Symbol normalization ──────────────────────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  "@ES": "ES", "@NQ": "NQ", "@RTY": "RTY", "@YM": "YM",
  "@CL": "CL", "@GC": "GC", "@SI": "SI", "@ZB": "ZB",
  "ESH5": "ES", "NQH5": "NQ",
};

function normalizeSymbol(raw: string): string {
  for (const [prefix, normalized] of Object.entries(SYMBOL_MAP)) {
    if (raw.startsWith(prefix)) return normalized;
  }
  return raw.replace(/[A-Z]{1,2}\d$/, (m) => m.slice(0, -1)); // strip expiry suffix
}

// ─── Trade normalization ───────────────────────────────────────────────────────

interface TradovateFilledOrder {
  id: number;
  contractId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  accountId: number;
  contractGroupId: number;
  orderId: number;
  execId: string;
  execType: string;
  execRefId?: number;
  spreadDefinitionId?: number;
  contractName: string;
  ocoOrderId?: number;
  side: "Buy" | "Sell";
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: number;
}

interface TradovateClosedPosition {
  id: number;
  accountId: number;
  contractId: number;
  contractName: string;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  side: "Buy" | "Sell";
  qty: number;
  buyPrice: number;
  sellPrice: number;
  realizedPnl: number;
}

function normalizeClosedPosition(pos: TradovateClosedPosition): NormalizedTrade {
  const direction: "long" | "short" = pos.side === "Buy" ? "long" : "short";
  const entryPrice = direction === "long" ? pos.buyPrice : pos.sellPrice;
  const exitPrice = direction === "long" ? pos.sellPrice : pos.buyPrice;

  return {
    externalId: String(pos.id),
    instrument: normalizeSymbol(pos.contractName),
    direction,
    entryPrice,
    exitPrice,
    quantity: pos.qty,
    pnl: Math.round(pos.realizedPnl * 100) / 100,
    pnlPercent: 0, // calculated downstream
    entryTime: new Date(pos.timestamp),
    exitTime: new Date(pos.timestamp),
    closeReason: "manual", // Tradovate doesn't natively expose TP/SL reason
    rawData: pos as unknown as Record<string, unknown>,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class TradovateAdapter implements PropFirmAdapter {
  readonly platform = "tradovate";
  private useMock: boolean;

  constructor({ mock = false } = {}) {
    this.useMock = mock || process.env.NODE_ENV === "development";
  }

  // ── OAuth2 helpers ──────────────────────────────────────────────────────────

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: TRADOVATE_OAUTH_CONFIG.clientId,
      redirect_uri: TRADOVATE_OAUTH_CONFIG.redirectUri,
      response_type: "code",
      scope: TRADOVATE_OAUTH_CONFIG.scopes.join(" "),
      state,
    });
    return `${TRADOVATE_OAUTH_CONFIG.authorizationUrl}?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuth2TokenResponse> {
    if (this.useMock) {
      return {
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
        expiresIn: 3600,
        tokenType: "Bearer",
      };
    }

    const res = await fetch(TRADOVATE_OAUTH_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: TRADOVATE_OAUTH_CONFIG.clientId,
        client_secret: TRADOVATE_OAUTH_CONFIG.clientSecret,
        code,
        redirect_uri: TRADOVATE_OAUTH_CONFIG.redirectUri,
      }),
    });

    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuth2TokenResponse> {
    if (this.useMock) {
      return {
        accessToken: "mock_refreshed_token",
        refreshToken,
        expiresIn: 3600,
        tokenType: "Bearer",
      };
    }

    const res = await fetch(TRADOVATE_OAUTH_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: TRADOVATE_OAUTH_CONFIG.clientId,
        client_secret: TRADOVATE_OAUTH_CONFIG.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  // ── PropFirmAdapter interface ───────────────────────────────────────────────

  async validateCredentials(
    credentials: IntegrationCredentials
  ): Promise<{ valid: boolean; accountId?: string; error?: string }> {
    if (this.useMock) {
      return { valid: true, accountId: "mock_account_123" };
    }

    const creds = credentials as TradovateCredentials;
    try {
      const res = await fetch(`${API_BASE}/account/list`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      const accounts = await res.json();
      return { valid: true, accountId: String(accounts[0]?.id) };
    } catch (err) {
      return { valid: false, error: String(err) };
    }
  }

  async fetchClosedTrades(
    credentials: IntegrationCredentials,
    since?: Date
  ): Promise<NormalizedTrade[]> {
    if (this.useMock) {
      return generateMockTrades(30);
    }

    const creds = credentials as TradovateCredentials;
    const url = new URL(`${API_BASE}/position/list`);
    if (since) url.searchParams.set("startTimestamp", since.toISOString());

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });

    if (!res.ok) throw new Error(`Tradovate API error: ${res.status}`);
    const positions: TradovateClosedPosition[] = await res.json();

    return positions
      .filter((p) => p.realizedPnl !== undefined)
      .map(normalizeClosedPosition);
  }

  subscribeToPositions(
    credentials: IntegrationCredentials,
    onClose: (trade: NormalizedTrade) => void,
    onError: (err: Error) => void
  ): () => void {
    if (this.useMock) {
      // Simulate trade closures every 15s in dev
      const interval = setInterval(() => {
        const [trade] = generateMockTrades(1);
        onClose(trade);
      }, 15000);
      return () => clearInterval(interval);
    }

    const creds = credentials as TradovateCredentials;
    const ws = new WebSocket(WS_URL);
    let heartbeatInterval: ReturnType<typeof setInterval>;

    ws.onopen = () => {
      ws.send(JSON.stringify({ url: "authorize", body: { token: creds.accessToken } }));
      heartbeatInterval = setInterval(() => ws.send("[]"), 2500);
    };

    ws.onmessage = (evt) => {
      try {
        if (evt.data === "o") return; // SockJS open frame
        const msg = JSON.parse(evt.data.slice(1)); // strip SockJS frame type
        if (!Array.isArray(msg)) return;

        for (const frame of msg) {
          if (frame.e === "pos/itemReplaced" && frame.d) {
            const pos = frame.d as TradovateClosedPosition;
            if (pos.realizedPnl !== undefined) {
              onClose(normalizeClosedPosition(pos));
            }
          }
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = (evt) => {
      onError(new Error(`WebSocket error: ${JSON.stringify(evt)}`));
    };

    return () => {
      clearInterval(heartbeatInterval);
      ws.close();
    };
  }
}

// Singleton for app usage
export const tradovate = new TradovateAdapter({ mock: process.env.NODE_ENV === "development" });
