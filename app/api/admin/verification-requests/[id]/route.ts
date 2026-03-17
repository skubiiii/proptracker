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
  const { action, adminNote } = await req.json();

  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const verificationRequest = await prisma.verificationRequest.findUnique({
    where: { id },
    select: { traderId: true },
  });

  if (!verificationRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: { status: action === "approve" ? "approved" : "denied", adminNote: adminNote?.trim() || null },
    }),
    ...(action === "approve"
      ? [prisma.trader.update({ where: { id: verificationRequest.traderId }, data: { isVerified: true } })]
      : []),
  ]);

  return NextResponse.json(updated);
}
