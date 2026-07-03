import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/auction-service";
import { requireAdmin } from "@/lib/admin-guard";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";

// Award current player to the current highest-bidding team
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const state = await prisma.auctionState.findUnique({ where: { id: "live" } });
  if (!state?.currentPlayerId)
    return NextResponse.json({ error: "No active player" }, { status: 400 });
  if (!state.currentTeamId)
    return NextResponse.json({ error: "No bids to award" }, { status: 400 });

  await prisma.$transaction([
    prisma.player.update({
      where: { id: state.currentPlayerId },
      data: {
        status: "SOLD",
        teamId: state.currentTeamId,
        soldPrice: state.currentBid
      }
    }),
    prisma.auctionState.update({
      where: { id: "live" },
      data: {
        currentPlayerId: null,
        currentBid: 0,
        currentTeamId: null,
        isRunning: false
      }
    })
  ]);

  const snap = await getLiveSnapshot();
  broadcast("state", snap);
  broadcast("sold", { playerId: state.currentPlayerId });
  return NextResponse.json(snap);
}
