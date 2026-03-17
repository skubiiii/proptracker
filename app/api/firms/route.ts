import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const firms = await prisma.propFirm.findMany({
    include: {
      connectedAccounts: {
        where: { status: "active" },
        include: {
          trader: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
              stats: { select: { totalPnl: true, winRate: true, followerCount: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    firms.map((f) => ({
      ...f,
      traderCount: f.connectedAccounts.length,
      traders: f.connectedAccounts.map((a) => a.trader),
    }))
  );
}
