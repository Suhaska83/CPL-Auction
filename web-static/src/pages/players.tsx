import { useMemo } from "react";
import { PlayersExplorer } from "@/components/players-explorer";
import { playerCounts, usePlayers, useTeams } from "@/hooks/useLiveData";

export function PlayersPage() {
  const { players } = usePlayers();
  const { teams } = useTeams();
  const counts = useMemo(() => playerCounts(players), [players]);

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">Players</h1>
      </header>
      <PlayersExplorer players={players} counts={counts} teams={teams} />
    </section>
  );
}
