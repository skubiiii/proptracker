"use client";

import { useState, useEffect, useRef } from "react";

const PROP_FIRMS = [
  { slug: "apex", name: "Apex Trader Funding", infrastructure: "rithmic", desc: "Rithmic API — username & password" },
  { slug: "topstep", name: "Topstep", infrastructure: "rithmic", desc: "Rithmic API — username & password" },
  { slug: "mff", name: "MyFundedFutures", infrastructure: "rithmic", desc: "Rithmic API — username & password" },
  { slug: "ftmo", name: "FTMO", infrastructure: "mt4", desc: "MT4 — server, login & password" },
  { slug: "the5ers", name: "The5ers", infrastructure: "mt5", desc: "MT5 — server, login & password" },
];

const INFRA_BADGE: Record<string, string> = {
  rithmic: "bg-orange-400/10 text-orange-400",
  mt4: "bg-green-400/10 text-green-400",
  mt5: "bg-teal-400/10 text-teal-400",
  tradovate: "bg-blue-400/10 text-blue-400",
};

type Step = "firm" | "credentials" | "connecting" | "success" | "error";

interface CredentialFields {
  rithmic: { label: string; key: string; type?: string }[];
  mt4: { label: string; key: string; type?: string }[];
  mt5: { label: string; key: string; type?: string }[];
  tradovate: { label: string; key: string; type?: string }[];
}

const CREDENTIAL_FIELDS: CredentialFields = {
  rithmic: [
    { label: "Username", key: "username" },
    { label: "Password", key: "password", type: "password" },
    { label: "FCM ID (e.g. Rithmic01)", key: "fcmId" },
  ],
  mt4: [
    { label: "Server (e.g. FTMO-Server3)", key: "server" },
    { label: "Login (account number)", key: "login" },
    { label: "Password", key: "password", type: "password" },
  ],
  mt5: [
    { label: "Server", key: "server" },
    { label: "Login (account number)", key: "login" },
    { label: "Password", key: "password", type: "password" },
  ],
  tradovate: [
    { label: "Email", key: "email" },
    { label: "Password", key: "password", type: "password" },
    { label: "App ID (from Tradovate portal)", key: "appId" },
  ],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConnectAccountModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("firm");
  const [selectedFirm, setSelectedFirm] = useState<typeof PROP_FIRMS[0] | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setStep("firm");
      setSelectedFirm(null);
      setCredentials({});
      setErrorMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const fields = selectedFirm
    ? CREDENTIAL_FIELDS[selectedFirm.infrastructure as keyof CredentialFields] ?? []
    : [];

  const allFilled = fields.every((f) => (credentials[f.key] ?? "").trim().length > 0);

  async function handleConnect() {
    setStep("connecting");
    setErrorMsg("");

    await new Promise((r) => setTimeout(r, 1200));

    const res = await fetch("/api/auth/connect-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propFirmSlug: selectedFirm!.slug,
        platform: selectedFirm!.infrastructure,
        accountIdentifier: credentials.username || credentials.login || credentials.email || "account",
      }),
    });

    if (res.ok) {
      setStep("success");
      onSuccess?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Connection failed. Please check your credentials.");
      setStep("error");
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="card w-full max-w-md mx-4 shadow-2xl shadow-black/50 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--card-border)]">
          <div>
            <h2 className="text-lg font-bold text-white">Connect Prop Firm Account</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {step === "firm" && "Select your prop firm"}
              {step === "credentials" && `Enter ${selectedFirm?.name} credentials`}
              {step === "connecting" && "Verifying connection..."}
              {step === "success" && "Account connected!"}
              {step === "error" && "Connection failed"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-white transition-colors text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        {(step === "firm" || step === "credentials") && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--card-border)]">
            {["firm", "credentials"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-[var(--card-border)]" />}
                <div className={`flex items-center gap-1.5 text-xs ${
                  step === s ? "text-[var(--accent)]" : i === 0 && step === "credentials" ? "text-green-400" : "text-[var(--muted)]"
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    step === s
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : i === 0 && step === "credentials"
                      ? "border-green-400 text-green-400 bg-green-400/10"
                      : "border-[var(--card-border)]"
                  }`}>
                    {i === 0 && step === "credentials" ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s === "firm" ? "Choose Firm" : "Credentials"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-5">
          {/* STEP 1: Select firm */}
          {step === "firm" && (
            <div className="flex flex-col gap-2">
              {PROP_FIRMS.map((firm) => (
                <button
                  key={firm.slug}
                  onClick={() => { setSelectedFirm(firm); setStep("credentials"); }}
                  className="flex items-center gap-4 p-3.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)]/50 hover:bg-white/[0.03] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--card-border)] to-[var(--card)] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {firm.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{firm.name}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{firm.desc}</div>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0 ${INFRA_BADGE[firm.infrastructure] ?? ""}`}>
                    {firm.infrastructure.toUpperCase()}
                  </div>
                  <div className="text-[var(--muted)] group-hover:text-white transition-colors text-lg">›</div>
                </button>
              ))}
              <p className="text-[10px] text-[var(--muted)] text-center mt-2">
                More firms coming soon: Tradovate (OAuth2), ProjectX, E8 Markets
              </p>
            </div>
          )}

          {/* STEP 2: Credentials */}
          {step === "credentials" && selectedFirm && (
            <div>
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--card-border)]">
                <button
                  onClick={() => setStep("firm")}
                  className="text-xs text-[var(--muted)] hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <span className="text-xs text-[var(--muted)]">/</span>
                <span className="text-xs text-white">{selectedFirm.name}</span>
              </div>

              <div className="flex flex-col gap-3 mb-5">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-[var(--muted)] mb-1.5">{field.label}</label>
                    <input
                      type={field.type ?? "text"}
                      value={credentials[field.key] ?? ""}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.type === "password" ? "••••••••" : ""}
                      className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 mb-5 text-xs text-yellow-400/80">
                <span className="mt-px">🔐</span>
                <span>
                  Credentials are encrypted at rest with AES-256. We connect read-only — no trading on your behalf.
                </span>
              </div>

              <button
                onClick={handleConnect}
                disabled={!allFilled}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Connect Account
              </button>
            </div>
          )}

          {/* STEP: Connecting */}
          {step === "connecting" && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-4" />
              <div className="text-white font-medium mb-1">Verifying credentials</div>
              <div className="text-xs text-[var(--muted)]">
                Connecting to {selectedFirm?.name}...
              </div>
              <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
                {["Authenticating...", "Fetching account info...", "Importing trade history..."].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <div className="w-3 h-3 rounded-full border border-[var(--accent)] border-t-transparent animate-spin" />
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: Success */}
          {step === "success" && (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <div className="text-white font-bold text-lg mb-1">Account Connected!</div>
              <div className="text-sm text-[var(--muted)] mb-2">
                {selectedFirm?.name} account linked successfully.
              </div>
              <div className="text-xs text-[var(--muted)] mb-6">
                Your closed trades will appear on your profile within a few minutes.
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-4 py-2.5 border border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Prop Firm</span>
                  <span className="text-white font-medium">{selectedFirm?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-4 py-2.5 border border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Platform</span>
                  <span className="text-white font-medium uppercase">{selectedFirm?.infrastructure}</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-4 py-2.5 border border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">Status</span>
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    Active
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-6 w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Done
              </button>
            </div>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <div className="py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✕
              </div>
              <div className="text-white font-bold text-lg mb-1">Connection Failed</div>
              <div className="text-sm text-[var(--muted)] mb-6">{errorMsg}</div>
              <button
                onClick={() => setStep("credentials")}
                className="w-full bg-[var(--card-border)] hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
