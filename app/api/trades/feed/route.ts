import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const skip = (page - 1) * limit;

  const [trades, total] = await Promise.all([
    prisma.closedTrade.findMany({
      orderBy: { exitTime: "desc" },
      skip,
      take: limit,
      include: {
        trader: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.closedTrade.count(),
  ]);

  return NextResponse.json({
    trades,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
