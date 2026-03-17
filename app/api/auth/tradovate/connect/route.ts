import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthorizationUrl } from "@/lib/integrations/tradovate";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const propFirmSlug = searchParams.get("propFirmSlug") ?? "apex";

  const state = randomBytes(16).toString("hex");

  const url = getAuthorizationUrl(state);

  const response = NextResponse.redirect(url);

  // Store state + context in a short-lived cookie
  response.cookies.set("tradovate_oauth", JSON.stringify({
    state,
    traderId: session.user.traderId,
    propFirmSlug,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
