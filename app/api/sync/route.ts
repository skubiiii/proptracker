import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticate, getTrades, mapFillsToTrades } from "@/lib/integrations/projectx";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.traderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { traderId: session.user.traderId, platform: "projectx", status: "active" },
  });

  const results = [];

  for (const account of accounts) {
    try {
      const creds = JSON.parse(account.credentialsEncrypted ?? "{}");
      const { username, apiKey } = creds;
      if (!username || !apiKey) continue;

      const token = await authenticate(username, apiKey);

      const accountIdNum = parseInt(account.accountIdentifier.split("#")[1]);
      if (isNaN(accountIdNum)) continue;

      const end = new Date();
      const start = account.lastSyncedAt ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const fills = await getTrades(token, accountIdNum, start, end);
      const trades = mapFillsToTrades(fills);

      let added = 0;
      if (trades.length > 0) {
        const result = await prisma.closedTrade.createMany({
          data: trades.map((t) => ({
            connectedAccountId: account.id,
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
        added = result.count;
      }

      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      results.push({ accountId: account.id, added, status: "ok" });
    } catch (err: any) {
      results.push({ accountId: account.id, error: err.message, status: "error" });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
