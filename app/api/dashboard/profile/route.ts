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

  const trader = await prisma.trader.findUnique({
    where: { id: session.user.traderId },
    select: { displayName: true, bio: true, twitterUrl: true, youtubeUrl: true, tiktokUrl: true, telegramUrl: true, slug: true },
  });

  return NextResponse.json(trader);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName, bio, twitterUrl, youtubeUrl, tiktokUrl, telegramUrl } = await req.json();

  const trader = await prisma.trader.update({
    where: { id: session.user.traderId },
    data: {
      displayName: displayName?.trim() || undefined,
      bio: bio?.trim() || null,
      twitterUrl: twitterUrl?.trim() || null,
      youtubeUrl: youtubeUrl?.trim() || null,
      tiktokUrl: tiktokUrl?.trim() || null,
      telegramUrl: telegramUrl?.trim() || null,
    },
    select: { displayName: true, bio: true, twitterUrl: true, youtubeUrl: true, tiktokUrl: true, telegramUrl: true, slug: true },
  });

  return NextResponse.json(trader);
}
