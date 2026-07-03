import { prisma } from "@/lib/db";
import { getPlayerCounts } from "@/lib/auction-service";
import { PlayersExplorer } from "@/components/players-explorer";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
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

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">Players</h1>
      </header>
      <PlayersExplorer initial={{ players, counts }} />
    </section>
  );
}
