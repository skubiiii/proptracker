// Shared types for all prop firm integrations

export interface IntegrationCredentials {
  platform: "tradovate" | "rithmic" | "projectx" | "mt4" | "mt5";
  [key: string]: string | number;
}

export interface TradovateCredentials extends IntegrationCredentials {
  platform: "tradovate";
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp
  accountId: string;
}

export interface RithmicCredentials extends IntegrationCredentials {
  platform: "rithmic";
  username: string;
  password: string; // encrypted at rest
  server: string;
  fcmId: string;
  ibId: string;
}

export interface MT4Credentials extends IntegrationCredentials {
  platform: "mt4" | "mt5";
  server: string;
  login: string;
  password: string; // encrypted at rest
}

// Normalized closed trade (integration-agnostic)
export interface NormalizedTrade {
  externalId: string; // platform-specific trade/order ID
  instrument: string; // normalized symbol e.g. "ES", "NQ", "EURUSD"
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  exitTime: Date;
  closeReason: "tp" | "sl" | "manual";
  rawData?: Record<string, unknown>; // original platform response
}

// Adapter interface — all integrations must implement this
export interface PropFirmAdapter {
  readonly platform: string;

  /** Verify credentials and return normalized account info */
  validateCredentials(credentials: IntegrationCredentials): Promise<{ valid: boolean; accountId?: string; error?: string }>;

  /** Fetch all closed trades since a given timestamp */
  fetchClosedTrades(credentials: IntegrationCredentials, since?: Date): Promise<NormalizedTrade[]>;

  /** Subscribe to real-time position updates (WebSocket) */
  subscribeToPositions?(
    credentials: IntegrationCredentials,
    onClose: (trade: NormalizedTrade) => void,
    onError: (err: Error) => void
  ): () => void; // returns unsubscribe fn
}

// OAuth2 flow types (Tradovate, ProjectX)
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuth2TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
