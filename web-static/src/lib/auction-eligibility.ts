import { isCaptionPlayer } from "@/lib/player-utils";
import type { Player, Team } from "@/types";

/** Roster ids marked as Caption (excluded from auction pool). */
export function captionPlayerIds(players: Player[], _teams?: Team[]): Set<string> {
  const ids = new Set<string>();
  for (const p of players) {
    if (p.id && isCaptionPlayer(p)) ids.add(p.id);
  }
  return ids;
}

export function isTeamCaptionPlayer(
  player: Player,
  _players?: Player[],
  _teams?: Team[]
): boolean {
  return isCaptionPlayer(player);
}

/** Can appear in admin queue / random pick / manual Start. */
export function isEligibleForAuction(
  player: Player,
  _players: Player[],
  _teams: Team[]
): boolean {
  if (player.status !== "AVAILABLE") return false;
  if (isCaptionPlayer(player)) return false;
  return true;
}

export function eligibleForAuction(players: Player[], teams: Team[]): Player[] {
  return players.filter((p) => isEligibleForAuction(p, players, teams));
}
