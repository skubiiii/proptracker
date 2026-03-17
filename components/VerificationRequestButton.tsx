"use client";

import { useState } from "react";

interface Props {
  initialIsVerified: boolean;
  initialStatus: string | null;
}

export function VerificationRequestButton({ initialIsVerified, initialStatus }: Props) {
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (isVerified) {
    return (
      <span className="badge-verified text-xs px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium">
        ✓ Verified
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-medium">
        Verification Pending
      </span>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await fetch("/api/dashboard/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      const data = await res.json();
      setStatus(data.status);
      setModalOpen(false);
    }
    setSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="btn-ghost text-xs !py-1.5 !px-3"
      >
        {status === "denied" ? "Re-request Verification" : "Request Verification"}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setModalOpen(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Request Verification</h2>
              <button onClick={() => setModalOpen(false)} className="text-[var(--muted)] hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              Tell us who you are and why you should be verified. Include links to your social media or trading results.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I am a prop trader with 2 years of experience..."
              rows={4}
              className="glass-input w-full resize-none text-sm mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-ghost flex-1 text-sm !py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm !py-2">
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
