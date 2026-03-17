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

  const trades = await prisma.closedTrade.findMany({
    where: { traderId: session.user.traderId },
    select: { pnl: true, exitTime: true },
    orderBy: { exitTime: "asc" },
  });

  // Group by day, accumulate P&L
  let cumulative = 0;
  const byDay = new Map<string, number>();

  for (const trade of trades) {
    const day = trade.exitTime.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + trade.pnl);
  }

  const points = Array.from(byDay.entries()).map(([date, pnl]) => {
    cumulative += pnl;
    return { date, value: Math.round(cumulative * 100) / 100 };
  });

  return NextResponse.json({ points });
}
