import { useMemo } from "react";
import { TeamsGrid } from "@/components/teams-grid";
import { teamStats, usePlayers, useTeams, useTournament } from "@/hooks/useLiveData";

export function TeamsPage() {
  const { value: tournament } = useTournament();
  const { teams } = useTeams();
  const { players } = usePlayers();

  const stats = useMemo(
    () => teamStats(teams, players, tournament.squadSize),
    [teams, players, tournament.squadSize]
  );

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">Teams</h1>
        <div className="text-sm text-white/60">
          {stats.length} franchises · Squad size {tournament.squadSize}
        </div>
      </header>
      <TeamsGrid teams={stats} />
    </section>
  );
}
