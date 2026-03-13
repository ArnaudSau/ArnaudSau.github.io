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
    include: {
      holdings: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(portfolios);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  const portfolio = await prisma.portfolio.create({
    data: {
      userId,
      name: body.name,
      type: body.type,
      broker: body.broker || "MANUAL",
      currency: body.currency || "EUR",
      openDate: body.openDate ? new Date(body.openDate) : new Date(),
    },
  });

  return NextResponse.json(portfolio);
}
