import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Get user's holdings tickers
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
  });

  const holdingIds = portfolios.flatMap((p) => p.holdings.map((h) => h.id));
  const tickers = portfolios.flatMap((p) => p.holdings.map((h) => h.ticker));

  const dividendEvents = await prisma.dividendEvent.findMany({
    where: {
      OR: [
        { holdingId: { in: holdingIds } },
        { ticker: { in: tickers } },
      ],
    },
    orderBy: { exDate: "asc" },
  });

  // Get dividend transactions
  const dividendTransactions = await prisma.transaction.findMany({
    where: {
      portfolioId: { in: portfolios.map((p) => p.id) },
      type: "DIVIDEND",
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ events: dividendEvents, transactions: dividendTransactions, holdings: portfolios.flatMap(p => p.holdings) });
}
