import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();

  const transaction = await prisma.transaction.create({
    data: {
      holdingId: body.holdingId,
      portfolioId: body.portfolioId,
      type: body.type,
      ticker: body.ticker,
      quantity: body.quantity,
      price: body.price,
      fees: body.fees || 0,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes,
    },
  });

  // Update holding quantity if BUY or SELL
  if (body.holdingId && (body.type === "BUY" || body.type === "SELL")) {
    const holding = await prisma.holding.findUnique({ where: { id: body.holdingId } });
    if (holding) {
      const newQuantity = body.type === "BUY"
        ? holding.quantity + body.quantity
        : holding.quantity - body.quantity;
      await prisma.holding.update({
        where: { id: body.holdingId },
        data: { quantity: Math.max(0, newQuantity) },
      });
    }
  }

  return NextResponse.json(transaction);
}
