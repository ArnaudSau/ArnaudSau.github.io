import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!portfolio || portfolio.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  const body = await req.json();

  const holding = await prisma.holding.create({
    data: {
      portfolioId: params.id,
      ticker: body.ticker,
      name: body.name,
      isin: body.isin,
      quantity: body.quantity,
      averagePurchasePrice: body.averagePurchasePrice,
      sector: body.sector,
      geographicZone: body.geographicZone,
      currency: body.currency || "EUR",
    },
  });

  // Create BUY transaction
  await prisma.transaction.create({
    data: {
      holdingId: holding.id,
      portfolioId: params.id,
      type: "BUY",
      ticker: body.ticker,
      quantity: body.quantity,
      price: body.averagePurchasePrice,
      fees: body.fees || 0,
      date: new Date(),
    },
  });

  return NextResponse.json(holding);
}
