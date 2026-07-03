import { prisma } from "@/lib/db";

// ─── Derived team financials ────────────────────────────────────────
export type TeamStats = {
  id: string;
  name: string;
  owner: string;
  shortCode: string;
  logoUrl: string | null;
  colorHex: string;
  totalBudget: number;
  reserveBalance: number;
  spent: number;
  balance: number;
  squadCount: number;
  squadSize: number;
  maxBid: number;
  players: { id: string; name: string; skill: string; soldPrice: number | null }[];
};

export async function getTeamStats(): Promise<TeamStats[]> {
  const [teams, tournament] = await Promise.all([
    prisma.team.findMany({
      include: {
        players: {
          select: { id: true, name: true, skill: true, soldPrice: true }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.tournament.findUnique({ where: { id: "main" } })
  ]);
  const squadSize = tournament?.squadSize ?? 13;

  return teams.map((t) => {
    const spent = t.players.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
    const balance = t.totalBudget - spent;
    const remainingSlots = Math.max(0, squadSize - 1 - t.players.length);
    // reserve = min-bid × remaining slots after this pick
    const holdBack = remainingSlots * (t.reserveBalance / (squadSize - 1 || 1));
    // Simpler: keep reserveBalance as a fixed "reserve floor" set in DB.
    const maxBid = Math.max(0, balance - t.reserveBalance);
    return {
      id: t.id,
      name: t.name,
      owner: t.owner,
      shortCode: t.shortCode,
      logoUrl: t.logoUrl,
      colorHex: t.colorHex,
      totalBudget: t.totalBudget,
      reserveBalance: t.reserveBalance,
      spent,
      balance,
      squadCount: t.players.length,
      squadSize,
      maxBid,
      players: t.players
    };
  });
}

// ─── Player status counts ───────────────────────────────────────────
export async function getPlayerCounts() {
  const [all, available, sold, unsold] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { status: "AVAILABLE" } }),
    prisma.player.count({ where: { status: "SOLD" } }),
    prisma.player.count({ where: { status: "UNSOLD" } })
  ]);
  return { all, available, sold, unsold };
}

// ─── Full live snapshot for socket broadcasts / initial load ────────
export async function getLiveSnapshot() {
  const [state, counts, teams] = await Promise.all([
    prisma.auctionState.findUnique({
      where: { id: "live" },
      include: {}
    }),
    getPlayerCounts(),
    getTeamStats()
  ]);

  let currentPlayer = null;
  let currentTeam = null;
  if (state?.currentPlayerId) {
    currentPlayer = await prisma.player.findUnique({
      where: { id: state.currentPlayerId }
    });
  }
  if (state?.currentTeamId) {
    currentTeam = teams.find((t) => t.id === state.currentTeamId) ?? null;
  }

  return {
    state: state
      ? {
          isRunning: state.isRunning,
          currentBid: state.currentBid,
          currentPlayerId: state.currentPlayerId,
          currentTeamId: state.currentTeamId
        }
      : { isRunning: false, currentBid: 0, currentPlayerId: null, currentTeamId: null },
    currentPlayer,
    currentTeam,
    counts,
    teams
  };
}

export type LiveSnapshot = Awaited<ReturnType<typeof getLiveSnapshot>>;
