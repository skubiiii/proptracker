import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { isVerified } = await req.json();

  const trader = await prisma.trader.update({
    where: { id },
    data: { isVerified },
  });

  return NextResponse.json({ id: trader.id, isVerified: trader.isVerified });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.$transaction([
    // 1. Trades reference both ConnectedAccount and Trader — delete first
    prisma.closedTrade.deleteMany({ where: { traderId: id } }),
    // 2. ConnectedAccounts reference Trader
    prisma.connectedAccount.deleteMany({ where: { traderId: id } }),
    // 3. Follows reference Trader
    prisma.follow.deleteMany({ where: { traderId: id } }),
    // 4. TraderStats references Trader
    prisma.traderStats.deleteMany({ where: { traderId: id } }),
    // 5. VerificationRequest references Trader
    prisma.verificationRequest.deleteMany({ where: { traderId: id } }),
    // 6. Finally delete the Trader itself
    prisma.trader.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
