import type { Player, Team } from "@/types";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Player name matches a franchise caption (caption is on squad, not auctioned). */
export function isTeamCaptionPlayer(player: Player, teams: Team[]): boolean {
  const name = norm(player.name);
  if (!name) return false;
  return teams.some((t) => norm(t.caption) === name);
}

/** Can appear in admin queue / random pick / manual Start. */
export function isEligibleForAuction(player: Player, teams: Team[]): boolean {
  if (player.status !== "AVAILABLE") return false;
  if (isTeamCaptionPlayer(player, teams)) return false;
  return true;
}

export function eligibleForAuction(players: Player[], teams: Team[]): Player[] {
  return players.filter((p) => isEligibleForAuction(p, teams));
}
