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
  const { role } = await req.json();

  if (!["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent self-demotion
  if (id === (session!.user as any).id && role !== "admin") {
    return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ id: user.id, role: user.role });
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

  if (id === (session!.user as any).id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  // Find linked trader (if any) to cascade-delete all their data first
  const user = await prisma.user.findUnique({
    where: { id },
    select: { trader: { select: { id: true } } },
  });
  const traderId = user?.trader?.id;

  await prisma.$transaction([
    // Trader's children
    ...(traderId ? [
      prisma.closedTrade.deleteMany({ where: { traderId } }),
      prisma.connectedAccount.deleteMany({ where: { traderId } }),
      prisma.follow.deleteMany({ where: { traderId } }),
      prisma.traderStats.deleteMany({ where: { traderId } }),
      prisma.verificationRequest.deleteMany({ where: { traderId } }),
      prisma.trader.delete({ where: { id: traderId } }),
    ] : []),
    // User's own follows (as a follower of other traders)
    prisma.follow.deleteMany({ where: { userId: id } }),
    // Delete the user
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
