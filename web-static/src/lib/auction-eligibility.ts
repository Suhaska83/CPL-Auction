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

/** One roster row per id and per display name (lowest player number wins). */
export function dedupeAuctionPoolPlayers(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => a.number - b.number);
  const seenId = new Set<string>();
  const seenName = new Set<string>();
  const out: Player[] = [];
  for (const p of sorted) {
    if (!p.id || seenId.has(p.id)) continue;
    seenId.add(p.id);
    const nameKey = p.name.trim().toLowerCase();
    if (seenName.has(nameKey)) continue;
    seenName.add(nameKey);
    out.push(p);
  }
  return out;
}

export function eligibleForAuction(players: Player[], teams: Team[]): Player[] {
  const roster = dedupeAuctionPoolPlayers(players);
  return roster.filter((p) => isEligibleForAuction(p, players, teams));
}
