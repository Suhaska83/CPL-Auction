import { safeLower, safeTrim } from "@/lib/safe-string";
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
    captionPhotoUrl: safeTrim(raw.captionPhotoUrl) || null
  };
}

export function findPlayerForCaption(team: Team, players: Player[]): Player | undefined {
  const cap = norm(team.caption);
  if (!cap) return undefined;
  return players.find((p) => norm(p.name) === cap);
}

/** Photo shown for caption in squad list (admin upload or roster name match). */
export function resolveCaptionPhotoUrl(team: Team, players: Player[]): string | null {
  const uploaded = safeTrim(team.captionPhotoUrl);
  if (uploaded) return uploaded;
  return safeTrim(findPlayerForCaption(team, players)?.photoUrl) || null;
}

function norm(s: unknown): string {
  return safeLower(s);
}
