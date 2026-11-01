import { safeTrim } from "@/lib/safe-string";
import type { Player, Team } from "@/types";

/** Normalized full name for caption ↔ roster comparison (trim, collapse spaces, lower). */
export function nameMatchKey(value: unknown): string {
  return safeTrim(value).replace(/\s+/g, " ").toLowerCase();
}

function playerMatchesCaption(player: Player, caption: string): boolean {
  const capKey = nameMatchKey(caption);
  if (!capKey) return false;
  return nameMatchKey(player.name) === capKey;
}

/**
 * Roster player ids that are franchise captions — only these are blocked from the auction pool.
 * captionPlayerId is used only when it points at a roster row whose name matches the caption text.
 */
export function captionPlayerIds(players: Player[], teams: Team[]): Set<string> {
  const ids = new Set<string>();
  for (const t of teams) {
    const capKey = nameMatchKey(t.caption);
    if (!capKey) continue;

    const linked = safeTrim(t.captionPlayerId);
    if (linked) {
      const row = players.find((p) => p.id === linked);
      if (row && playerMatchesCaption(row, t.caption)) {
        ids.add(linked);
      }
      continue;
    }

    const matches = players.filter((p) => nameMatchKey(p.name) === capKey);
    if (matches.length === 1) ids.add(matches[0]!.id);
  }
  return ids;
}

/** True when this roster row is a franchise caption (blocked from random pick / queue). */
export function isTeamCaptionPlayer(
  player: Player,
  players: Player[],
  teams: Team[]
): boolean {
  if (!player.id) return false;
  return captionPlayerIds(players, teams).has(player.id);
}

/** Can appear in admin queue / random pick / manual Start (must be AVAILABLE, not a caption). */
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
