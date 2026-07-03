import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/auction-service";
import { requireAdmin } from "@/lib/admin-guard";
import { broadcast } from "@/lib/bus";

export const dynamic = "force-dynamic";

// Place a bid: pass { teamId } (uses tournament bidIncrement) OR { teamId, amount } for explicit amount.
export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const { teamId, amount } = body as { teamId?: string; amount?: number };
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const [state, tournament, team] = await Promise.all([
    prisma.auctionState.findUnique({ where: { id: "live" } }),
    prisma.tournament.findUnique({ where: { id: "main" } }),
    prisma.team.findUnique({ where: { id: teamId }, include: { players: true } })
  ]);
  if (!state?.currentPlayerId)
    return NextResponse.json({ error: "No active player" }, { status: 400 });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const player = await prisma.player.findUnique({
    where: { id: state.currentPlayerId }
  });
  if (!player) return NextResponse.json({ error: "Player missing" }, { status: 400 });

  const increment = tournament?.bidIncrement ?? 2_500_000;
  const nextAmount =
    typeof amount === "number" && amount > 0
      ? amount
      : (state.currentBid || player.basePrice) +
        (state.currentBid > 0 ? increment : 0);

  if (nextAmount <= state.currentBid) {
    return NextResponse.json(
      { error: "Bid must be greater than current bid" },
      { status: 400 }
    );
  }

  // Enforce team's max bid capacity
  const spent = team.players.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const balance = team.totalBudget - spent;
  const maxBid = Math.max(0, balance - team.reserveBalance);
  if (nextAmount > maxBid) {
    return NextResponse.json(
      { error: `Bid exceeds team's max bid capacity (${maxBid})` },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.bid.create({
      data: { playerId: player.id, teamId: team.id, amount: nextAmount }
    }),
    prisma.auctionState.update({
      where: { id: "live" },
      data: { currentBid: nextAmount, currentTeamId: team.id }
    })
  ]);

  const snap = await getLiveSnapshot();
  broadcast("state", snap);
  broadcast("bid", { teamId: team.id, amount: nextAmount });
  return NextResponse.json(snap);
}
