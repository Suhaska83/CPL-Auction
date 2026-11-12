import { useMemo } from "react";
import { AuctionLiveView } from "@/components/auction-live-view";
import { ManagedByLogo } from "@/components/managed-by-logo";
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

  const counts = useMemo(() => playerCounts(players, teams), [players, teams]);
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-white">
            Live Auction
          </h1>
        </div>
        <div className="flex flex-col items-center sm:items-end">
          <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/55">
            Managed By
          </div>
          <ManagedByLogo className="mt-2 h-36 w-auto max-w-[min(100%,28rem)] object-contain drop-shadow-[0_0_28px_rgba(250,204,21,0.35)] sm:h-44 md:h-52 lg:h-60" />
        </div>
      </header>
      <AuctionLiveView
        players={players}
        teams={teams}
        state={state}
        currentPlayer={currentPlayer}
        currentTeam={currentTeam}
        currentBid={state.currentBid}
        isRunning={state.isRunning}
        counts={counts}
      />
    </section>
  );
}
