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

  const traders = await prisma.trader.findMany({
    select: {
      id: true,
      displayName: true,
      slug: true,
      isVerified: true,
      avatarUrl: true,
      createdAt: true,
      user: { select: { email: true } },
      stats: { select: { totalTrades: true, totalPnl: true, winRate: true, followerCount: true } },
      verificationRequest: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(traders);
}
