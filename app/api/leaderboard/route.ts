import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all"; // daily | weekly | monthly | all

  const now = new Date();
  let since: Date | null = null;
  if (period === "daily") since = new Date(now.getTime() - 86400000);
  else if (period === "weekly") since = new Date(now.getTime() - 7 * 86400000);
  else if (period === "monthly") since = new Date(now.getTime() - 30 * 86400000);

  if (period === "all") {
    const traders = await prisma.trader.findMany({
      include: {
        stats: true,
        connectedAccounts: { include: { propFirm: true }, take: 1 },
      },
      orderBy: { stats: { totalPnl: "desc" } },
    });

    return NextResponse.json(
      traders.map((t, i) => ({
        rank: i + 1,
        id: t.id,
        slug: t.slug,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        isVerified: t.isVerified,
        propFirm: t.connectedAccounts[0]?.propFirm ?? null,
        stats: t.stats,
      }))
    );
  }

  // For time-filtered periods, aggregate from closed_trades
  const traders = await prisma.trader.findMany({
    include: {
      connectedAccounts: { include: { propFirm: true }, take: 1 },
      stats: true,
    },
  });

  const tradeAggs = await prisma.closedTrade.groupBy({
    by: ["traderId"],
    where: since ? { exitTime: { gte: since } } : {},
    _sum: { pnl: true },
    _count: { id: true },
  });

  const aggMap = Object.fromEntries(
    tradeAggs.map((a) => [a.traderId, { pnl: a._sum.pnl ?? 0, count: a._count.id }])
  );

  const ranked = traders
    .map((t) => ({
      rank: 0,
      id: t.id,
      slug: t.slug,
      displayName: t.displayName,
      avatarUrl: t.avatarUrl,
      isVerified: t.isVerified,
      propFirm: t.connectedAccounts[0]?.propFirm ?? null,
      stats: t.stats,
      periodPnl: aggMap[t.id]?.pnl ?? 0,
      periodTrades: aggMap[t.id]?.count ?? 0,
    }))
    .sort((a, b) => b.periodPnl - a.periodPnl)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  return NextResponse.json(ranked);
}
