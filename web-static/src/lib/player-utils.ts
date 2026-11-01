import { safeTrim } from "@/lib/safe-string";
import type { Player, PlayerType } from "@/types";

/** Normalized full name (trim, collapse spaces, lower). */
export function nameMatchKey(value: unknown): string {
  return safeTrim(value).replace(/\s+/g, " ").toLowerCase();
}

export function normalizePlayerType(value: unknown): PlayerType {
  const s = safeTrim(value).toLowerCase();
  if (s === "caption") return "Caption";
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

export function isCaptionPlayer(player: Pick<Player, "playerType">): boolean {
  return normalizePlayerType(player.playerType) === "Caption";
}
