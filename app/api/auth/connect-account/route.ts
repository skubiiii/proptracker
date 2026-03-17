import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticate, getAccounts, getTrades, mapFillsToTrades } from "@/lib/integrations/projectx";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propFirmSlug, platform, accountIdentifier, credentials } = await req.json();

  if (!propFirmSlug || !platform) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const propFirm = await prisma.propFirm.findUnique({ where: { slug: propFirmSlug } });
  if (!propFirm) {
    return NextResponse.json({ error: "Prop firm not found" }, { status: 404 });
  }

  // --- ProjectX real auth ---
  if (platform === "projectx" && credentials) {
    const { username, apiKey } = credentials;
    if (!username || !apiKey) {
      return NextResponse.json({ error: "Username and API key are required" }, { status: 400 });
    }

    let token: string;
    try {
      token = await authenticate(username, apiKey);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? "Authentication failed" }, { status: 401 });
    }

    let accounts;
    try {
      accounts = await getAccounts(token);
    } catch (err: any) {
      return NextResponse.json({ error: "Failed to fetch accounts: " + err.message }, { status: 502 });
    }

    if (!accounts.length) {
      return NextResponse.json({ error: "No active accounts found on this ProjectX account" }, { status: 404 });
    }

    const pxAccount = accounts[0];
    const identifier = `${username}#${pxAccount.id}`;

    const existing = await prisma.connectedAccount.findFirst({
      where: { traderId: session.user.traderId, propFirmId: propFirm.id, accountIdentifier: identifier },
    });
    if (existing) {
      return NextResponse.json({ error: "Account already connected" }, { status: 409 });
    }

    const connected = await prisma.connectedAccount.create({
      data: {
        traderId: session.user.traderId,
        propFirmId: propFirm.id,
        platform,
        accountIdentifier: identifier,
        credentialsEncrypted: JSON.stringify({ username, apiKey }),
        status: "active",
      },
      include: { propFirm: true },
    });

    // Initial trade sync — last 90 days
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);

      const fills = await getTrades(token, pxAccount.id, start, end);
      const trades = mapFillsToTrades(fills);

      if (trades.length > 0) {
        await prisma.closedTrade.createMany({
          data: trades.map((t) => ({
            connectedAccountId: connected.id,
            traderId: session.user.traderId!,
            instrument: t.instrument,
            direction: t.direction,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            quantity: t.quantity,
            pnl: t.pnl,
            pnlPercent: t.pnlPercent,
            entryTime: t.entryTime,
            exitTime: t.exitTime,
            closeReason: t.closeReason,
          })),
          skipDuplicates: true,
        });
      }

      await prisma.connectedAccount.update({
        where: { id: connected.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (syncErr) {
      // Sync failure is non-fatal — account is still connected
      console.error("Initial sync failed:", syncErr);
    }

    return NextResponse.json({
      success: true,
      account: {
        id: connected.id,
        propFirmName: connected.propFirm.name,
        platform: connected.platform,
        accountIdentifier: connected.accountIdentifier,
        status: connected.status,
      },
    });
  }

  // --- Generic fallback (Tradovate etc — stubbed) ---
  const identifier = accountIdentifier ?? "account";

  const existing = await prisma.connectedAccount.findFirst({
    where: { traderId: session.user.traderId, propFirmId: propFirm.id, accountIdentifier: identifier },
  });
  if (existing) {
    return NextResponse.json({ error: "Account already connected" }, { status: 409 });
  }

  const account = await prisma.connectedAccount.create({
    data: {
      traderId: session.user.traderId,
      propFirmId: propFirm.id,
      platform,
      accountIdentifier: identifier,
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
