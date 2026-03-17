import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticate, getTrades, mapFillsToTrades } from "@/lib/integrations/projectx";
import {
  renewToken,
  getFillPairs,
  getFills,
  getContracts,
  mapFillPairsToTrades,
} from "@/lib/integrations/tradovate";

export const dynamic = "force-dynamic";

async function saveTrades(
  trades: ReturnType<typeof mapFillsToTrades> | ReturnType<typeof mapFillPairsToTrades>,
  connectedAccountId: string,
  traderId: string
) {
  if (!trades.length) return 0;
  const result = await prisma.closedTrade.createMany({
    data: trades.map((t) => ({
      connectedAccountId,
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
  return result.count;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traderId = session.user.traderId;

  const accounts = await prisma.connectedAccount.findMany({
    where: { traderId, status: "active", platform: { in: ["projectx", "tradovate"] } },
  });

  const results = [];

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
        const added = await saveTrades(trades, account.id, traderId);
        await prisma.connectedAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
        results.push({ accountId: account.id, platform: "projectx", added, status: "ok" });
      }

      if (account.platform === "tradovate") {
        let { accessToken, expirationTime } = creds;
        if (!accessToken) continue;
        // Renew token if within 5 minutes of expiry
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
          getFillPairs(accessToken),
          getFills(accessToken),
          getContracts(accessToken),
        ]);
        const trades = mapFillPairsToTrades(fillPairs, fills, contracts);
        const added = await saveTrades(trades, account.id, traderId);
        await prisma.connectedAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
        results.push({ accountId: account.id, platform: "tradovate", added, status: "ok" });
      }
    } catch (err: any) {
      results.push({ accountId: account.id, platform: account.platform, error: err.message, status: "error" });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
