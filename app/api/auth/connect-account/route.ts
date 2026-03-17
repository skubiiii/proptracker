import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propFirmSlug, platform, accountIdentifier } = await req.json();

  if (!propFirmSlug || !platform || !accountIdentifier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const propFirm = await prisma.propFirm.findUnique({ where: { slug: propFirmSlug } });
  if (!propFirm) {
    return NextResponse.json({ error: "Prop firm not found" }, { status: 404 });
  }

  const existing = await prisma.connectedAccount.findFirst({
    where: {
      traderId: session.user.traderId,
      propFirmId: propFirm.id,
      accountIdentifier,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Account already connected" }, { status: 409 });
  }

  const account = await prisma.connectedAccount.create({
    data: {
      traderId: session.user.traderId,
      propFirmId: propFirm.id,
      platform,
      accountIdentifier,
      status: "active",
    },
    include: { propFirm: true },
  });

  return NextResponse.json({
    success: true,
    account: {
      id: account.id,
      propFirmName: account.propFirm.name,
      platform: account.platform,
      accountIdentifier: account.accountIdentifier,
      status: account.status,
    },
  });
}
