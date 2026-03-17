"use client";

interface Point {
  date: string;
  value: number;
}

interface EquityCurveProps {
  points: Point[];
}

export function EquityCurve({ points }: EquityCurveProps) {
  if (points.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-[var(--muted)]">
        Not enough data to display chart
      </div>
    );
  }

  const W = 800;
  const H = 120;
  const PAD = { top: 10, right: 8, bottom: 20, left: 8 };

  const values = points.map((p) => p.value);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const range = maxV - minV || 1;

  const toX = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((maxV - v) / range) * (H - PAD.top - PAD.bottom);

  const zeroY = toY(0);
  const isPositive = points[points.length - 1].value >= 0;
  const strokeColor = isPositive ? "#4ade80" : "#f87171";
  const gradientId = `ec-grad-${isPositive ? "green" : "red"}`;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${toX(points.length - 1).toFixed(1)} ${zeroY.toFixed(1)}` +
    ` L ${toX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "120px" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Zero line */}
      <line
        x1={PAD.left}
        y1={zeroY}
        x2={W - PAD.right}
        y2={zeroY}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />

      {/* Fill area */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" />
    </svg>
  );
}
