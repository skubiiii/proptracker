import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const trades = await prisma.closedTrade.findMany({
    where: { traderId: session.user.traderId },
    orderBy: { exitTime: "desc" },
    take: limit,
    select: {
      id: true,
      instrument: true,
      direction: true,
      entryPrice: true,
      exitPrice: true,
      quantity: true,
      pnl: true,
      pnlPercent: true,
      entryTime: true,
      exitTime: true,
      closeReason: true,
      connectedAccount: { include: { propFirm: true } },
    },
  });

  return NextResponse.json({ trades });
}
