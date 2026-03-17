import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [userCount, traderCount, tradeCount, verifiedCount, pendingVerifications, pnlAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.trader.count(),
      prisma.closedTrade.count(),
      prisma.trader.count({ where: { isVerified: true } }),
      prisma.verificationRequest.count({ where: { status: "pending" } }),
      prisma.closedTrade.aggregate({ _sum: { pnl: true } }),
    ]);

  return NextResponse.json({
    userCount,
    traderCount,
    tradeCount,
    verifiedCount,
    pendingVerifications,
    totalPnl: pnlAgg._sum.pnl ?? 0,
  });
}
