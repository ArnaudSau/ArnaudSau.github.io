import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: params.id },
    include: {
      holdings: true,
      transactions: { orderBy: { date: "desc" } },
    },
  });

  if (!portfolio || portfolio.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  return NextResponse.json(portfolio);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findUnique({ where: { id: params.id } });
  if (!portfolio || portfolio.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  await prisma.portfolio.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
