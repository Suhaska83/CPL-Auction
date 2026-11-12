import { nameMatchKey } from "@/lib/player-utils";
import { safeTrim } from "@/lib/safe-string";
import type { Player, Team } from "@/types";

/** RTDB may still store legacy `owner`; prefer `caption`. */
export type TeamLike = Team & { owner?: string };

export function teamCaption(team: TeamLike): string {
  return safeTrim(team.caption ?? team.owner);
}

export function normalizeTeam(id: string, raw: TeamLike): Team {
  const { owner: _legacy, ...rest } = raw;
  return {
    ...rest,
    id,
    caption: teamCaption(raw),
    captionPlayerId: safeTrim(raw.captionPlayerId) || null,
    captionPhotoUrl: safeTrim(raw.captionPhotoUrl) || null
  };
}

export function findPlayerForCaption(team: Team, players: Player[]): Player | undefined {
  const linked = safeTrim(team.captionPlayerId);
  if (linked) return players.find((p) => p.id === linked);
  const capKey = nameMatchKey(team.caption);
  if (!capKey) return undefined;
  const matches = players.filter((p) => nameMatchKey(p.name) === capKey);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Photo shown for caption in squad list (admin upload or roster name match). */
export function resolveCaptionPhotoUrl(team: Team, players: Player[]): string | null {
  const uploaded = safeTrim(team.captionPhotoUrl);
  if (uploaded) return uploaded;
  return safeTrim(findPlayerForCaption(team, players)?.photoUrl) || null;
}

