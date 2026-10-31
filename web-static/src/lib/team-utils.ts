import type { Team } from "@/types";

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
    caption: teamCaption(raw)
  };
}
