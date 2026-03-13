import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();

  const holding = await prisma.holding.update({
    where: { id: params.id },
    data: {
      quantity: body.quantity,
      averagePurchasePrice: body.averagePurchasePrice,
      sector: body.sector,
      geographicZone: body.geographicZone,
    },
  });

  return NextResponse.json(holding);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await prisma.holding.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
