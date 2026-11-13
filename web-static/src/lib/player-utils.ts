import { safeTrim } from "@/lib/safe-string";
import type { Player, PlayerStatus, PlayerType } from "@/types";

/** Can be picked for auction (includes legacy UNSOLD rows). */
export function isAuctionPoolStatus(status: PlayerStatus | undefined): boolean {
  return status === "AVAILABLE" || status === "UNSOLD";
}

/** Normalized full name (trim, collapse spaces, lower). */
export function nameMatchKey(value: unknown): string {
  return safeTrim(value).replace(/\s+/g, " ").toLowerCase();
}

export function normalizePlayerType(value: unknown): PlayerType {
  const s = safeTrim(value).toLowerCase();
  if (s === "captain" || s === "caption" || s === "captian") return "Captain";
  return "Player";
}

export function normalizePlayer(id: string, raw: Player): Player {
  return {
    ...raw,
    id,
    name: safeTrim(raw.name),
    skill: safeTrim(raw.skill) || "Batsman",
    status: raw.status ?? "AVAILABLE",
    playerType: normalizePlayerType(raw.playerType)
  };
}

export function isCaptainPlayer(player: Pick<Player, "playerType">): boolean {
  return normalizePlayerType(player.playerType) === "Captain";
}
