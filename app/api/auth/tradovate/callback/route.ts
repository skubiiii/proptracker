import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateTraderStats } from "@/lib/stats";
import {
  exchangeCodeForToken,
  getAccounts,
  getFillPairs,
  getFills,
  getContracts,
  mapFillPairsToTrades,
} from "@/lib/integrations/tradovate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const dashboardUrl = new URL("/dashboard", req.url);
  const errorUrl = (msg: string) => {
    dashboardUrl.searchParams.set("error", msg);
    return NextResponse.redirect(dashboardUrl);
  };

  if (!code) return errorUrl("No authorization code returned from Tradovate");

  // Verify state from cookie
  const oauthCookie = req.cookies.get("tradovate_oauth")?.value;
  if (!oauthCookie) return errorUrl("OAuth session expired — please try again");

  let cookieData: { state: string; traderId: string; propFirmSlug: string };
  try {
    cookieData = JSON.parse(oauthCookie);
  } catch {
    return errorUrl("Invalid OAuth session");
  }

  if (cookieData.state !== returnedState) {
    return errorUrl("OAuth state mismatch — possible CSRF");
  }

  const { traderId, propFirmSlug } = cookieData;

  // Exchange code for token
  let tokenData;
  try {
    tokenData = await exchangeCodeForToken(code);
  } catch (err: any) {
    return errorUrl(err.message ?? "Token exchange failed");
  }

  const { accessToken, expirationTime, userId } = tokenData;

  // Get accounts
  let accounts;
  try {
    accounts = await getAccounts(accessToken);
  } catch (err: any) {
    return errorUrl("Failed to fetch Tradovate accounts");
  }

  if (!accounts.length) return errorUrl("No active Tradovate accounts found");

  const account = accounts[0];

  // Find prop firm record
  const propFirm = await prisma.propFirm.findUnique({ where: { slug: propFirmSlug } });
  if (!propFirm) return errorUrl("Prop firm not found in database");

  const identifier = `${userId}#${account.id}`;

  // Check if already connected
  const existing = await prisma.connectedAccount.findFirst({
    where: { traderId, propFirmId: propFirm.id, accountIdentifier: identifier },
  });

  let connectedAccount;
  if (existing) {
    connectedAccount = existing;
  } else {
    connectedAccount = await prisma.connectedAccount.create({
      data: {
        traderId,
        propFirmId: propFirm.id,
        platform: "tradovate",
        accountIdentifier: identifier,
        credentialsEncrypted: JSON.stringify({ accessToken, expirationTime, userId }),
        status: "active",
      },
    });
  }

  // Initial trade sync
  try {
    const [fillPairs, fills, contracts] = await Promise.all([
      getFillPairs(accessToken),
      getFills(accessToken),
      getContracts(accessToken),
    ]);

    const trades = mapFillPairsToTrades(fillPairs, fills, contracts);

    if (trades.length > 0) {
      await prisma.closedTrade.createMany({
        data: trades.map((t) => ({
          connectedAccountId: connectedAccount.id,
          traderId,
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
      where: { id: connectedAccount.id },
      data: { lastSyncedAt: new Date() },
    });

    await recalculateTraderStats(traderId).catch(() => {});
  } catch (err) {
    console.error("Tradovate initial sync failed:", err);
    // Non-fatal — account is connected, trades can be synced later
  }

  // Clear cookie and redirect to dashboard
  const response = NextResponse.redirect(dashboardUrl);
  response.cookies.set("tradovate_oauth", "", { maxAge: 0, path: "/" });
  return response;
}
