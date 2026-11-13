import { nameMatchKey } from "@/lib/player-utils";
import { safeTrim } from "@/lib/safe-string";
import type { Player, Team } from "@/types";

/** Legacy RTDB keys (caption / owner / captian typo). */
export type TeamLike = Team & {
  owner?: string;
  caption?: string;
  captian?: string;
  captionPlayerId?: string | null;
  captionPhotoUrl?: string | null;
};

export function teamCaptainName(team: TeamLike): string {
  return safeTrim(team.captain ?? team.caption ?? team.captian ?? team.owner);
}

export function normalizeTeam(id: string, raw: TeamLike): Team {
  const { owner: _o, caption: _c, captian: _t, ...rest } = raw;
  return {
    ...rest,
    id,
    captain: teamCaptainName(raw),
    captainPlayerId:
      safeTrim(raw.captainPlayerId) || safeTrim(raw.captionPlayerId) || null,
    captainPhotoUrl:
      safeTrim(raw.captainPhotoUrl) || safeTrim(raw.captionPhotoUrl) || null
  };
}

export function findPlayerForCaptain(team: Team, players: Player[]): Player | undefined {
  const linked = safeTrim(team.captainPlayerId);
  if (linked) return players.find((p) => p.id === linked);
  const capKey = nameMatchKey(team.captain);
  if (!capKey) return undefined;
  const matches = players.filter((p) => nameMatchKey(p.name) === capKey);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Photo shown for captain in squad list (admin upload or roster name match). */
export function resolveCaptainPhotoUrl(team: Team, players: Player[]): string | null {
  const uploaded = safeTrim(team.captainPhotoUrl);
  if (uploaded) return uploaded;
  return safeTrim(findPlayerForCaptain(team, players)?.photoUrl) || null;
}
