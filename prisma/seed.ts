import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROP_FIRMS = [
  {
    name: "Apex Trader Funding",
    slug: "apex",
    infrastructure: "rithmic",
    websiteUrl: "https://apextraderfunding.com",
    logoUrl: null,
  },
  {
    name: "FTMO",
    slug: "ftmo",
    infrastructure: "mt4",
    websiteUrl: "https://ftmo.com",
    logoUrl: null,
  },
  {
    name: "Topstep",
    slug: "topstep",
    infrastructure: "rithmic",
    websiteUrl: "https://topstep.com",
    logoUrl: null,
  },
  {
    name: "The5ers",
    slug: "the5ers",
    infrastructure: "mt5",
    websiteUrl: "https://the5ers.com",
    logoUrl: null,
  },
  {
    name: "MyFundedFutures",
    slug: "mff",
    infrastructure: "rithmic",
    websiteUrl: "https://myfundedfutures.com",
    logoUrl: null,
  },
];

const TRADERS = [
  {
    displayName: "AlphaWave",
    slug: "alphawave",
    bio: "ES/NQ scalper. 3+ years funded. Consistency is the edge.",
    twitterUrl: "https://twitter.com/alphawave",
    youtubeUrl: "https://youtube.com/@alphawave",
    isVerified: true,
    firmSlug: "apex",
  },
  {
    displayName: "NightOwlFX",
    slug: "nightowlfx",
    bio: "Asian session FX trader. EURUSD specialist.",
    twitterUrl: "https://twitter.com/nightowlfx",
    tiktokUrl: "https://tiktok.com/@nightowlfx",
    isVerified: true,
    firmSlug: "ftmo",
  },
  {
    displayName: "MomentumKing",
    slug: "momentumking",
    bio: "Momentum breakout trader. NQ and CL. Risk-first mindset.",
    twitterUrl: "https://twitter.com/momentumking",
    youtubeUrl: "https://youtube.com/@momentumking",
    isVerified: true,
    firmSlug: "apex",
  },
  {
    displayName: "ZenTrader",
    slug: "zentrader",
    bio: "Patient swing trader. High RR setups only. FTMO funded.",
    twitterUrl: "https://twitter.com/zentrader",
    telegramUrl: "https://t.me/zentrader",
    isVerified: false,
    firmSlug: "ftmo",
  },
  {
    displayName: "ScalpSurgeon",
    slug: "scalpsurgeon",
    bio: "1-5 tick scalps on ES. Speed and precision.",
    twitterUrl: "https://twitter.com/scalpsurgeon",
    tiktokUrl: "https://tiktok.com/@scalpsurgeon",
    isVerified: true,
    firmSlug: "topstep",
  },
  {
    displayName: "DeltaNeutral",
    slug: "deltaneutral",
    bio: "Options-informed futures trading. Gamma aware.",
    twitterUrl: "https://twitter.com/deltaneutral",
    youtubeUrl: "https://youtube.com/@deltaneutral",
    isVerified: false,
    firmSlug: "apex",
  },
  {
    displayName: "VixSlayer",
    slug: "vixslayer",
    bio: "Trades around volatility events. Earnings, CPI, FOMC specialist.",
    twitterUrl: "https://twitter.com/vixslayer",
    telegramUrl: "https://t.me/vixslayer",
    isVerified: true,
    firmSlug: "the5ers",
  },
  {
    displayName: "TrendFollower99",
    slug: "trendfollower99",
    bio: "Pure trend following. Daily and 4H setups. No counter-trend.",
    twitterUrl: "https://twitter.com/trendfollower99",
    youtubeUrl: "https://youtube.com/@trendfollower99",
    isVerified: false,
    firmSlug: "mff",
  },
  {
    displayName: "OrderFlowPro",
    slug: "orderflowpro",
    bio: "DOM, footprint, and delta divergence. Institutional footprint reader.",
    twitterUrl: "https://twitter.com/orderflowpro",
    tiktokUrl: "https://tiktok.com/@orderflowpro",
    isVerified: true,
    firmSlug: "topstep",
  },
  {
    displayName: "GridironCapital",
    slug: "grideircapital",
    bio: "Systematic trader. Backtested 8 years. ES mean reversion.",
    twitterUrl: "https://twitter.com/grideircapital",
    youtubeUrl: "https://youtube.com/@grideircapital",
    isVerified: false,
    firmSlug: "apex",
  },
  {
    displayName: "LiquidityHunter",
    slug: "liquidityhunter",
    bio: "ICT concepts. Hunting buy/sell side liquidity on NQ.",
    twitterUrl: "https://twitter.com/liquidityhunter",
    telegramUrl: "https://t.me/liquidityhunter",
    isVerified: true,
    firmSlug: "ftmo",
  },
  {
    displayName: "BreakoutBull",
    slug: "breakoutbull",
    bio: "London/NY session breakouts. RTY and YM trader.",
    twitterUrl: "https://twitter.com/breakoutbull",
    tiktokUrl: "https://tiktok.com/@breakoutbull",
    isVerified: false,
    firmSlug: "mff",
  },
  {
    displayName: "SniperEntry",
    slug: "sniperentry",
    bio: "High conviction setups only. Max 3 trades per day.",
    twitterUrl: "https://twitter.com/sniperentry",
    youtubeUrl: "https://youtube.com/@sniperentry",
    isVerified: true,
    firmSlug: "the5ers",
  },
  {
    displayName: "CryptoFutures",
    slug: "cryptofutures",
    bio: "BTC and ETH futures. Micro contracts. Risk 1% max.",
    twitterUrl: "https://twitter.com/cryptofutures",
    tiktokUrl: "https://tiktok.com/@cryptofutures",
    isVerified: false,
    firmSlug: "apex",
  },
  {
    displayName: "MacroMatrix",
    slug: "macromatrix",
    bio: "Macro-driven futures. Treasury yields + equities correlation.",
    twitterUrl: "https://twitter.com/macromatrix",
    telegramUrl: "https://t.me/macromatrix",
    isVerified: true,
    firmSlug: "ftmo",
  },
];

const INSTRUMENTS = [
  "ES", "NQ", "RTY", "YM", "CL", "GC", "EURUSD", "GBPUSD", "BTCUSD", "ETHUSD",
];

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrade(traderId: string, accountId: string, baseDate: Date) {
  const instrument = randItem(INSTRUMENTS);
  const direction = Math.random() > 0.5 ? "long" : "short";
  const isWin = Math.random() > 0.42; // ~58% win rate across the board

  // Entry price based on instrument
  const priceMap: Record<string, number> = {
    ES: 5200, NQ: 18200, RTY: 2050, YM: 42000, CL: 78,
    GC: 2050, EURUSD: 1.085, GBPUSD: 1.265, BTCUSD: 65000, ETHUSD: 3200,
  };
  const basePrice = priceMap[instrument] ?? 1000;
  const entryPrice = basePrice + randFloat(-basePrice * 0.005, basePrice * 0.005, 2);

  const movePercent = isWin ? randFloat(0.003, 0.025) : randFloat(0.001, 0.015);
  const priceDelta = entryPrice * movePercent;

  let exitPrice: number;
  if (direction === "long") {
    exitPrice = isWin ? entryPrice + priceDelta : entryPrice - priceDelta;
  } else {
    exitPrice = isWin ? entryPrice - priceDelta : entryPrice + priceDelta;
  }

  const quantity = randFloat(1, 5, 0);
  const multiplierMap: Record<string, number> = {
    ES: 50, NQ: 20, RTY: 50, YM: 5, CL: 1000,
    GC: 100, EURUSD: 100000, GBPUSD: 100000, BTCUSD: 1, ETHUSD: 1,
  };
  const mult = multiplierMap[instrument] ?? 1;
  const rawPnl = (exitPrice - entryPrice) * quantity * mult * (direction === "long" ? 1 : -1);
  const pnl = parseFloat(rawPnl.toFixed(2));
  const pnlPercent = parseFloat(((pnl / (entryPrice * quantity * mult)) * 100).toFixed(3));

  const durationMinutes = randInt(2, 240);
  const entryTime = new Date(baseDate.getTime() - randInt(0, 86400000 * 90));
  const exitTime = new Date(entryTime.getTime() + durationMinutes * 60000);

  const closeReasons = ["tp", "sl", "manual"] as const;
  const closeReason = isWin
    ? Math.random() > 0.2 ? "tp" : "manual"
    : Math.random() > 0.2 ? "sl" : "manual";

  return {
    traderId,
    connectedAccountId: accountId,
    instrument,
    direction,
    entryPrice: parseFloat(entryPrice.toFixed(4)),
    exitPrice: parseFloat(exitPrice.toFixed(4)),
    quantity,
    pnl,
    pnlPercent,
    entryTime,
    exitTime,
    closeReason,
    createdAt: exitTime,
  };
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.traderStats.deleteMany();
  await prisma.closedTrade.deleteMany();
  await prisma.connectedAccount.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.trader.deleteMany();
  await prisma.propFirm.deleteMany();
  await prisma.user.deleteMany();

  // Seed prop firms
  const firms = await Promise.all(
    PROP_FIRMS.map((f) => prisma.propFirm.create({ data: f }))
  );
  const firmBySlug = Object.fromEntries(firms.map((f) => [f.slug, f]));
  console.log(`Created ${firms.length} prop firms`);

  // Seed traders + connected accounts
  const traderRecords = [];
  const accountRecords = [];

  for (const t of TRADERS) {
    const trader = await prisma.trader.create({
      data: {
        displayName: t.displayName,
        slug: t.slug,
        bio: t.bio,
        twitterUrl: t.twitterUrl ?? null,
        youtubeUrl: t.youtubeUrl ?? null,
        tiktokUrl: t.tiktokUrl ?? null,
        telegramUrl: t.telegramUrl ?? null,
        isVerified: t.isVerified,
      },
    });

    const firm = firmBySlug[t.firmSlug];
    const account = await prisma.connectedAccount.create({
      data: {
        traderId: trader.id,
        propFirmId: firm.id,
        platform: firm.infrastructure,
        accountIdentifier: `ACC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "active",
        lastSyncedAt: new Date(),
      },
    });

    traderRecords.push(trader);
    accountRecords.push({ trader, account });
  }
  console.log(`Created ${traderRecords.length} traders`);

  // Seed ~500 closed trades (spread unevenly — some traders are more active)
  const now = new Date();
  let totalTrades = 0;

  for (const { trader, account } of accountRecords) {
    const tradeCount = randInt(20, 60);
    const trades = Array.from({ length: tradeCount }, () =>
      generateTrade(trader.id, account.id, now)
    );
    await prisma.closedTrade.createMany({ data: trades });
    totalTrades += tradeCount;
  }
  console.log(`Created ${totalTrades} closed trades`);

  // Calculate and seed trader_stats
  for (const { trader } of accountRecords) {
    const trades = await prisma.closedTrade.findMany({
      where: { traderId: trader.id },
    });

    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = trades.length > 0 ? wins.length / trades.length : 0;
    const bestTrade = Math.max(...trades.map((t) => t.pnl), 0);
    const worstTrade = Math.min(...trades.map((t) => t.pnl), 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
    const avgRr = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Compute max drawdown (running)
    let peak = 0, runningPnl = 0, maxDrawdown = 0;
    for (const t of trades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())) {
      runningPnl += t.pnl;
      if (runningPnl > peak) peak = runningPnl;
      const dd = peak - runningPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const avgDuration =
      trades.length > 0
        ? trades.reduce((sum, t) => {
            return sum + (t.exitTime.getTime() - t.entryTime.getTime()) / 60000;
          }, 0) / trades.length
        : 0;

    // Consistency: normalized score 0-100 based on win rate + avg RR
    const consistencyScore = Math.min(100, (winRate * 60 + Math.min(avgRr, 3) * 13.3));

    await prisma.traderStats.create({
      data: {
        traderId: trader.id,
        totalTrades: trades.length,
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        winRate: parseFloat((winRate * 100).toFixed(2)),
        avgRr: parseFloat(avgRr.toFixed(2)),
        bestTrade: parseFloat(bestTrade.toFixed(2)),
        worstTrade: parseFloat(worstTrade.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        avgTradeDurationMinutes: parseFloat(avgDuration.toFixed(1)),
        consistencyScore: parseFloat(consistencyScore.toFixed(1)),
        followerCount: randInt(50, 15000),
      },
    });
  }
  console.log("Calculated trader stats");

  // Seed some users and follows
  const users = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          username: `user${i + 1}`,
          passwordHash: "seed_placeholder",
        },
      })
    )
  );

  for (const user of users) {
    const followCount = randInt(1, 5);
    const shuffled = [...traderRecords].sort(() => Math.random() - 0.5);
    for (let i = 0; i < followCount && i < shuffled.length; i++) {
      await prisma.follow.create({
        data: { userId: user.id, traderId: shuffled[i].id },
      });
    }
  }
  console.log(`Created ${users.length} users with follows`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
