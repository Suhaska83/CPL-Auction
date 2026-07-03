import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlayerCounts } from "@/lib/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const [players, counts] = await Promise.all([
    prisma.player.findMany({
      orderBy: { number: "asc" },
      include: {
        team: {
          select: { name: true, shortCode: true, colorHex: true, logoUrl: true }
        }
      }
    }),
    getPlayerCounts()
  ]);
  return NextResponse.json({ players, counts });
}
