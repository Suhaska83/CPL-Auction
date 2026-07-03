import { getLiveSnapshot } from "@/lib/auction-service";
import { AuctionLiveView } from "@/components/auction-live-view";

export const dynamic = "force-dynamic";

export default async function AuctionPage() {
  const initial = await getLiveSnapshot();
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-white">
          Live Auction
        </h1>
      </header>
      <AuctionLiveView initial={initial} />
    </section>
  );
}
