import { safeTrim } from "@/lib/safe-string";
import type { Player, Team } from "@/types";

/** Normalized full name for caption ↔ roster comparison (trim, collapse spaces, lower). */
export function nameMatchKey(value: unknown): string {
  return safeTrim(value).replace(/\s+/g, " ").toLowerCase();
}

/**
 * Roster player ids that are franchise captions — only these are blocked from bidding.
 * - Uses team.captionPlayerId when set.
 * - Otherwise links caption text to a roster row only when exactly one player name matches.
 */
export function captionPlayerIds(players: Player[], teams: Team[]): Set<string> {
  const ids = new Set<string>();
  for (const t of teams) {
    const linked = safeTrim(t.captionPlayerId);
    if (linked) {
      ids.add(linked);
      continue;
    }
    const capKey = nameMatchKey(t.caption);
    if (!capKey) continue;
    const matches = players.filter((p) => nameMatchKey(p.name) === capKey);
    if (matches.length === 1) ids.add(matches[0]!.id);
  }
  return ids;
}

export function isTeamCaptionPlayer(
  player: Player,
  players: Player[],
  teams: Team[]
): boolean {
  if (!player.id) return false;
  return captionPlayerIds(players, teams).has(player.id);
}

/** Can appear in admin queue / random pick / manual Start. */
export function isEligibleForAuction(
  player: Player,
  players: Player[],
  teams: Team[]
): boolean {
  if (player.status !== "AVAILABLE") return false;
  if (isTeamCaptionPlayer(player, players, teams)) return false;
  return true;
}

export function eligibleForAuction(players: Player[], teams: Team[]): Player[] {
  const blocked = captionPlayerIds(players, teams);
  return players.filter(
    (p) => p.status === "AVAILABLE" && !blocked.has(p.id)
  );
}
