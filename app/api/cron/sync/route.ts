import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateTraderStats } from "@/lib/stats";
import { authenticate, getTrades, mapFillsToTrades } from "@/lib/integrations/projectx";
import { renewToken, getFillPairs, getFills, getContracts, mapFillPairsToTrades } from "@/lib/integrations/tradovate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { status: "active", platform: { in: ["projectx", "tradovate"] } },
  });

  const traderIds = new Set<string>();
  let synced = 0;

  for (const account of accounts) {
    try {
      const creds = JSON.parse(account.credentialsEncrypted ?? "{}");

      if (account.platform === "projectx") {
        const { username, apiKey } = creds;
        if (!username || !apiKey) continue;
        const token = await authenticate(username, apiKey);
        const accountIdNum = parseInt(account.accountIdentifier.split("#")[1]);
        if (isNaN(accountIdNum)) continue;
        const end = new Date();
        const start = account.lastSyncedAt ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const fills = await getTrades(token, accountIdNum, start, end);
        const trades = mapFillsToTrades(fills);
        if (trades.length > 0) {
          await prisma.closedTrade.createMany({
            data: trades.map((t) => ({
              connectedAccountId: account.id,
              traderId: account.traderId,
              instrument: t.instrument, direction: t.direction,
              entryPrice: t.entryPrice, exitPrice: t.exitPrice,
              quantity: t.quantity, pnl: t.pnl, pnlPercent: t.pnlPercent,
              entryTime: t.entryTime, exitTime: t.exitTime, closeReason: t.closeReason,
            })),
            skipDuplicates: true,
          });
        }
        await prisma.connectedAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
      }

      if (account.platform === "tradovate") {
        let { accessToken, expirationTime } = creds;
        if (!accessToken) continue;
        if (expirationTime && new Date(expirationTime).getTime() - Date.now() < 5 * 60 * 1000) {
          const renewed = await renewToken(accessToken);
          accessToken = renewed.accessToken;
          expirationTime = renewed.expirationTime;
          await prisma.connectedAccount.update({
            where: { id: account.id },
            data: { credentialsEncrypted: JSON.stringify({ ...creds, accessToken, expirationTime }) },
          });
        }
        const [fillPairs, fills, contracts] = await Promise.all([
          getFillPairs(accessToken), getFills(accessToken), getContracts(accessToken),
        ]);
        const trades = mapFillPairsToTrades(fillPairs, fills, contracts);
        if (trades.length > 0) {
          await prisma.closedTrade.createMany({
            data: trades.map((t) => ({
              connectedAccountId: account.id,
              traderId: account.traderId,
              instrument: t.instrument, direction: t.direction,
              entryPrice: t.entryPrice, exitPrice: t.exitPrice,
              quantity: t.quantity, pnl: t.pnl, pnlPercent: t.pnlPercent,
              entryTime: t.entryTime, exitTime: t.exitTime, closeReason: t.closeReason,
            })),
            skipDuplicates: true,
          });
        }
        await prisma.connectedAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
      }

      traderIds.add(account.traderId);
      synced++;
    } catch (err) {
      console.error(`Cron sync failed for account ${account.id}:`, err);
    }
  }

  // Recalculate stats for all affected traders
  await Promise.all(Array.from(traderIds).map((id) => recalculateTraderStats(id).catch(() => {})));

  return NextResponse.json({ synced, traders: traderIds.size });
}
