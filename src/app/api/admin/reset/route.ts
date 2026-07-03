import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/auction-service";
import { requireAdmin } from "@/lib/admin-guard";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";

// Emergency: reset current live state (does NOT touch sold history unless full=true)
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const full = url.searchParams.get("full") === "true";

  await prisma.auctionState.update({
    where: { id: "live" },
    data: {
      currentPlayerId: null,
      currentBid: 0,
      currentTeamId: null,
      isRunning: false
    }
  });
  await prisma.player.updateMany({
    where: { status: "ON_AUCTION" },
    data: { status: "AVAILABLE" }
  });
  if (full) {
    await prisma.bid.deleteMany();
    await prisma.player.updateMany({
      data: { status: "AVAILABLE", teamId: null, soldPrice: null }
    });
  }

  const snap = await getLiveSnapshot();
  broadcast("state", snap);
  return NextResponse.json(snap);
}
