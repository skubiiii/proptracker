import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, username, password } = await req.json();

  if (!email || !username || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json({ error: `That ${field} is already taken` }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, "-");

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, username, passwordHash },
    });

    const trader = await tx.trader.create({
      data: {
        userId: user.id,
        displayName: username,
        slug,
      },
    });

    return { user, trader };
  });

  return NextResponse.json({
    success: true,
    userId: result.user.id,
    traderId: result.trader.id,
    traderSlug: result.trader.slug,
  });
}
