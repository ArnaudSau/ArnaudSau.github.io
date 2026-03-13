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

  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
  });

  const userTickers = portfolios.flatMap((p) => p.holdings.map((h) => h.ticker));

  const earnings = await prisma.earningsCalendar.findMany({
    orderBy: { reportDate: "asc" },
  });

  // Tag which earnings are in user's portfolio
  const tagged = earnings.map((e) => ({
    ...e,
    inPortfolio: userTickers.includes(e.ticker),
  }));

  return NextResponse.json(tagged);
}
