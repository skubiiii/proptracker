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
    prisma.connectedAccount.findMany({
      where: { traderId },
      include: { propFirm: true },
      orderBy: { connectedAt: "asc" },
    }),
    prisma.closedTrade.findMany({
      where: { traderId },
      select: { pnl: true, connectedAccountId: true },
    }),
    prisma.traderStats.findUnique({ where: { traderId } }),
  ]);

  // Per-account aggregates
  const accStats: Record<string, { pnl: number; wins: number; total: number }> = {};
  for (const t of allTrades) {
    const a = accStats[t.connectedAccountId] ?? { pnl: 0, wins: 0, total: 0 };
    a.pnl += t.pnl;
    a.total++;
    if (t.pnl > 0) a.wins++;
    accStats[t.connectedAccountId] = a;
  }

  // Build account breakdown with accountType + token expiry check
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
      accountType: acc.accountType, // "funded" | "evaluation" | "unknown"
      status: acc.status,
      connectedAt: acc.connectedAt,
      lastSyncedAt: acc.lastSyncedAt,
      pnl: a.pnl,
      tradeCount: a.total,
      winRate: a.total > 0 ? (a.wins / a.total) * 100 : 0,
      tokenExpired,
    };
  });

  // Funded-only P&L (the number that matters)
  const fundedAccountIds = new Set(
    accounts.filter((a) => a.accountType === "funded").map((a) => a.id)
  );
  const fundedPnl = allTrades
    .filter((t) => fundedAccountIds.has(t.connectedAccountId))
    .reduce((s, t) => s + t.pnl, 0);

  // Fall back to all trades if no funded accounts tagged yet
  const hasFunded = fundedAccountIds.size > 0;

  return NextResponse.json({
    totalPnl: hasFunded ? fundedPnl : allTrades.reduce((s, t) => s + t.pnl, 0),
    fundedPnl,
    hasFunded,
    totalTrades: stats?.totalTrades ?? allTrades.length,
    winRate: stats?.winRate ?? 0,
    avgRr: stats?.avgRr ?? 0,
    followerCount: stats?.followerCount ?? 0,
    accounts: accountBreakdown,
  });
}
