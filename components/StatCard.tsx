interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}

export function StatCard({ label, value, sub, positive, negative }: StatCardProps) {
  const valueClass = positive
    ? "pnl-positive"
    : negative
    ? "pnl-negative"
    : "text-white";

  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--muted)] mt-0.5">{sub}</div>}
    </div>
  );
}
