import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/auction-service";
import { requireAdmin } from "@/lib/admin-guard";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";

// Start bidding on a specific player
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const { playerId } = body as { playerId?: string };
  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (player.status === "SOLD")
    return NextResponse.json({ error: "Player already sold" }, { status: 400 });

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { status: "ON_AUCTION" }
    }),
    prisma.auctionState.upsert({
      where: { id: "live" },
      create: {
        id: "live",
        currentPlayerId: playerId,
        currentBid: player.basePrice,
        currentTeamId: null,
        isRunning: true
      },
      update: {
        currentPlayerId: playerId,
        currentBid: player.basePrice,
        currentTeamId: null,
        isRunning: true
      }
    })
  ]);

  const snap = await getLiveSnapshot();
  broadcast("state", snap);
  return NextResponse.json(snap);
}
