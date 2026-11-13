import { isAuctionPoolStatus, isCaptainPlayer } from "@/lib/player-utils";
import type { Player, Team } from "@/types";

/** Roster ids marked as Captain (excluded from auction pool). */
export function captainPlayerIds(players: Player[], _teams?: Team[]): Set<string> {
  const ids = new Set<string>();
  for (const p of players) {
    if (p.id && isCaptainPlayer(p)) ids.add(p.id);
  }
  return ids;
}

export function isTeamCaptainPlayer(
  player: Player,
  _players?: Player[],
  _teams?: Team[]
): boolean {
  return isCaptainPlayer(player);
}

/** Can appear in admin queue / random pick / manual Start. */
export function isEligibleForAuction(
  player: Player,
  _players: Player[],
  _teams: Team[]
): boolean {
  if (!isAuctionPoolStatus(player.status)) return false;
  if (isCaptainPlayer(player)) return false;
  return true;
}

export function eligibleForAuction(players: Player[], teams: Team[]): Player[] {
  return players.filter((p) => isEligibleForAuction(p, players, teams));
}
