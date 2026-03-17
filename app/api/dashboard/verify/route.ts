import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { traderId: session.user.traderId },
    select: { status: true, message: true, adminNote: true, createdAt: true },
  });

  const trader = await prisma.trader.findUnique({
    where: { id: session.user.traderId },
    select: { isVerified: true },
  });

  return NextResponse.json({ request, isVerified: trader?.isVerified ?? false });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.verificationRequest.findUnique({
    where: { traderId: session.user.traderId },
  });

  if (existing && existing.status === "pending") {
    return NextResponse.json({ error: "Verification request already pending" }, { status: 409 });
  }
  if (existing && existing.status === "approved") {
    return NextResponse.json({ error: "Already verified" }, { status: 409 });
  }

  const { message } = await req.json();

  const request = await prisma.verificationRequest.upsert({
    where: { traderId: session.user.traderId },
    update: { status: "pending", message: message?.trim() || null, adminNote: null },
    create: { traderId: session.user.traderId, message: message?.trim() || null },
  });

  return NextResponse.json(request);
}
