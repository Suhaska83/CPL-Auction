import { useMemo } from "react";
import { AuctionLiveView } from "@/components/auction-live-view";
import {
  playerCounts,
  teamStats,
  useAuctionState,
  usePlayers,
  useTeams,
  useTournament
} from "@/hooks/useLiveData";

export function AuctionPage() {
  const { value: tournament } = useTournament();
  const { players } = usePlayers();
  const { teams } = useTeams();
  const { state } = useAuctionState();

  const counts = useMemo(() => playerCounts(players), [players]);
  const stats = useMemo(
    () => teamStats(teams, players, tournament.squadSize),
    [teams, players, tournament.squadSize]
  );
  const currentPlayer = state.currentPlayerId
    ? players.find((p) => p.id === state.currentPlayerId) ?? null
    : null;
  const currentTeam = state.currentTeamId
    ? stats.find((t) => t.id === state.currentTeamId) ?? null
    : null;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-white">
          Live Auction
        </h1>
      </header>
      <AuctionLiveView
        currentPlayer={currentPlayer}
        currentTeam={currentTeam}
        currentBid={state.currentBid}
        isRunning={state.isRunning}
        counts={counts}
      />
    </section>
  );
}
