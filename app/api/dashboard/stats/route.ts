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

  const [accounts, allTrades, stats] = await Promise.all([
    prisma.connectedAccount.findMany({ where: { traderId }, include: { propFirm: true } }),
    prisma.closedTrade.findMany({
      where: { traderId },
      select: { pnl: true, connectedAccountId: true },
    }),
    prisma.traderStats.findUnique({ where: { traderId } }),
  ]);

  const totalPnl = allTrades.reduce((s, t) => s + t.pnl, 0);

  // Per-account aggregates
  const accStats: Record<string, { pnl: number; wins: number; total: number }> = {};
  for (const t of allTrades) {
    const a = accStats[t.connectedAccountId] ?? { pnl: 0, wins: 0, total: 0 };
    a.pnl += t.pnl;
    a.total++;
    if (t.pnl > 0) a.wins++;
    accStats[t.connectedAccountId] = a;
  }

  // Check for expired Tradovate tokens
  const now = Date.now();
  const accountBreakdown = accounts.map((acc) => {
    const a = accStats[acc.id] ?? { pnl: 0, wins: 0, total: 0 };
    let tokenExpired = false;
    if (acc.platform === "tradovate" && acc.credentialsEncrypted) {
      try {
        const creds = JSON.parse(acc.credentialsEncrypted);
        if (creds.expirationTime && new Date(creds.expirationTime).getTime() < now) {
          tokenExpired = true;
        }
      } catch {}
    }
    return {
      id: acc.id,
      propFirmName: acc.propFirm.name,
      propFirmSlug: acc.propFirm.slug,
      platform: acc.platform,
      accountIdentifier: acc.accountIdentifier,
      status: acc.status,
      connectedAt: acc.connectedAt,
      lastSyncedAt: acc.lastSyncedAt,
      pnl: a.pnl,
      tradeCount: a.total,
      winRate: a.total > 0 ? (a.wins / a.total) * 100 : 0,
      tokenExpired,
    };
  });

  return NextResponse.json({
    totalPnl,
    totalTrades: stats?.totalTrades ?? allTrades.length,
    winRate: stats?.winRate ?? 0,
    avgRr: stats?.avgRr ?? 0,
    followerCount: stats?.followerCount ?? 0,
    accounts: accountBreakdown,
  });
}
