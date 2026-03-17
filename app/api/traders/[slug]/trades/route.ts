import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const trader = await prisma.trader.findUnique({ where: { slug } });
  if (!trader) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [trades, total] = await Promise.all([
    prisma.closedTrade.findMany({
      where: { traderId: trader.id },
      orderBy: { exitTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.closedTrade.count({ where: { traderId: trader.id } }),
  ]);

  return NextResponse.json({
    trades,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
