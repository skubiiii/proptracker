import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 2MB limit" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const filename = `avatars/${session.user.id}.${ext}`;

  const blob = await put(filename, file, { access: "public", allowOverwrite: true });

  await prisma.$transaction([
    prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: blob.url } }),
    prisma.trader.update({ where: { id: session.user.traderId }, data: { avatarUrl: blob.url } }),
  ]);

  return NextResponse.json({ avatarUrl: blob.url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });

  if (user?.avatarUrl) {
    try {
      await del(user.avatarUrl);
    } catch {
      // blob may not exist, proceed anyway
    }
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } }),
    prisma.trader.update({ where: { id: session.user.traderId }, data: { avatarUrl: null } }),
  ]);

  return NextResponse.json({ success: true });
}
