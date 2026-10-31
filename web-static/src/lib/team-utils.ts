import type { Player, Team } from "@/types";

/** RTDB may still store legacy `owner`; prefer `caption`. */
export type TeamLike = Team & { owner?: string };

export function teamCaption(team: TeamLike): string {
  return (team.caption ?? team.owner ?? "").trim();
}

export function normalizeTeam(id: string, raw: TeamLike): Team {
  const { owner: _legacy, ...rest } = raw;
  return {
    ...rest,
    id,
    caption: teamCaption(raw),
    captionPhotoUrl: raw.captionPhotoUrl?.trim() || null
  };
}

export function findPlayerForCaption(team: Team, players: Player[]): Player | undefined {
  const cap = norm(team.caption);
  if (!cap) return undefined;
  return players.find((p) => norm(p.name) === cap);
}

/** Photo shown for caption in squad list (admin upload or roster name match). */
export function resolveCaptionPhotoUrl(team: Team, players: Player[]): string | null {
  const uploaded = team.captionPhotoUrl?.trim();
  if (uploaded) return uploaded;
  return findPlayerForCaption(team, players)?.photoUrl?.trim() ?? null;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}
