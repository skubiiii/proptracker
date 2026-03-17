import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traderId = session.user.traderId;

  const [accounts, trades, stats] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { traderId },
      include: { propFirm: true },
    }),
    prisma.closedTrade.findMany({
      where: { traderId },
      select: { pnl: true, connectedAccountId: true },
    }),
    prisma.traderStats.findUnique({ where: { traderId } }),
  ]);

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  const pnlByAccount: Record<string, number> = {};
  for (const trade of trades) {
    pnlByAccount[trade.connectedAccountId] =
      (pnlByAccount[trade.connectedAccountId] ?? 0) + trade.pnl;
  }

  const accountBreakdown = accounts.map((acc) => ({
    id: acc.id,
    propFirmName: acc.propFirm.name,
    propFirmSlug: acc.propFirm.slug,
    platform: acc.platform,
    accountIdentifier: acc.accountIdentifier,
    status: acc.status,
    connectedAt: acc.connectedAt,
    pnl: pnlByAccount[acc.id] ?? 0,
  }));

  return NextResponse.json({
    totalPnl,
    totalTrades: stats?.totalTrades ?? trades.length,
    winRate: stats?.winRate ?? 0,
    avgRr: stats?.avgRr ?? 0,
    followerCount: stats?.followerCount ?? 0,
    accounts: accountBreakdown,
  });
}
