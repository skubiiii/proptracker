import { prisma } from "@/lib/prisma";

export async function recalculateTraderStats(traderId: string) {
  const trades = await prisma.closedTrade.findMany({
    where: { traderId },
    select: { pnl: true, entryTime: true, exitTime: true },
    orderBy: { exitTime: "asc" },
  });

  if (!trades.length) return;

  const totalTrades = trades.length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = (wins.length / totalTrades) * 100;

  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
    : 1;
  const avgRr = avgLoss > 0 ? avgWin / avgLoss : 0;

  const bestTrade = Math.max(...trades.map((t) => t.pnl));
  const worstTrade = Math.min(...trades.map((t) => t.pnl));

  // Max drawdown
  let peak = 0, maxDrawdown = 0, running = 0;
  for (const t of trades) {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Avg trade duration in minutes
  const durations = trades.map(
    (t) => (new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime()) / 60000
  );
  const avgTradeDurationMinutes =
    durations.reduce((s, d) => s + d, 0) / durations.length;

  // Consistency score 0-100
  const consistencyScore = Math.min(
    100,
    Math.max(0, winRate * 0.4 + Math.min(avgRr * 20, 40) + Math.max(0, 20 - maxDrawdown / 1000))
  );

  await prisma.traderStats.upsert({
    where: { traderId },
    create: {
      traderId,
      totalTrades,
      totalPnl,
      winRate,
      avgRr,
      bestTrade,
      worstTrade,
      maxDrawdown,
      avgTradeDurationMinutes,
      consistencyScore,
    },
    update: {
      totalTrades,
      totalPnl,
      winRate,
      avgRr,
      bestTrade,
      worstTrade,
      maxDrawdown,
      avgTradeDurationMinutes,
      consistencyScore,
      lastCalculatedAt: new Date(),
    },
  });
}
