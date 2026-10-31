import type { Player } from "@/types";

/** Next player in auction order (lowest number still AVAILABLE). */
export function pickNextEligiblePlayer(players: Player[]): Player | null {
  return (
    players
      .filter((p) => p.status === "AVAILABLE")
      .sort((a, b) => a.number - b.number)[0] ?? null
  );
}
