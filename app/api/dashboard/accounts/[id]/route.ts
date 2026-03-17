import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountType } = await req.json();
  if (!["funded", "evaluation", "unknown"].includes(accountType)) {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  // Ensure account belongs to this trader
  const account = await prisma.connectedAccount.findFirst({
    where: { id: params.id, traderId: session.user.traderId },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const updated = await prisma.connectedAccount.update({
    where: { id: params.id },
    data: { accountType },
  });

  return NextResponse.json({ accountType: updated.accountType });
}
