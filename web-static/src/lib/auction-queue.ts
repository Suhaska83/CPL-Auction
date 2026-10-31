import { eligibleForAuction } from "@/lib/auction-eligibility";
import type { Player, Team } from "@/types";

/** Next player in auction order (lowest number still eligible). */
export function pickNextEligiblePlayer(players: Player[], teams: Team[]): Player | null {
  return (
    eligibleForAuction(players, teams).sort((a, b) => a.number - b.number)[0] ?? null
  );
}
