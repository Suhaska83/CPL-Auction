import { prisma } from "@/lib/db";
import { getLiveSnapshot } from "@/lib/auction-service";
import { AdminPanel } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [players, snap] = await Promise.all([
    prisma.player.findMany({
      where: { status: { in: ["AVAILABLE", "ON_AUCTION", "UNSOLD"] } },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        name: true,
        skill: true,
        basePrice: true,
        status: true,
        photoUrl: true
      }
    }),
    getLiveSnapshot()
  ]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">
          Auction Console
        </h1>
        <div className="text-sm text-white/60">Auctioneer controls</div>
      </header>
      <AdminPanel initialPlayers={players} initialSnapshot={snap} />
    </section>
  );
}
