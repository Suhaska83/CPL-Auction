import { formatINR } from "@/lib/format";
import type { Player, Team, TeamStats } from "@/types";

/** One row: photo | name | sold amount (for live auction or team squad). */
export function SoldPlayerRow({
  player,
  soldPrice,
  teamName
}: {
  player: Player;
  soldPrice: number;
  teamName?: string | null;
}) {
  return (
    <div className="flex w-full items-center gap-4 rounded-md border border-panel-border bg-panel/80 px-3 py-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gold-500/60">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-navy-800 text-sm font-bold text-white/60">
            {player.number}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-display text-lg font-bold text-white">
          #{player.number} {player.name}
        </div>
        <div className="text-xs text-white/50">
          {player.skill}
          {teamName ? ` · ${teamName}` : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] uppercase tracking-wider text-white/50">Sold for</div>
        <div className="font-display text-xl font-bold text-gold-400">₹{formatINR(soldPrice)}</div>
      </div>
    </div>
  );
}

/** Team caption (not auctioned) — always first in squad list. */
export function CaptionSquadRow({ team }: { team: Pick<TeamStats, "caption" | "name" | "logoUrl" | "shortCode" | "colorHex"> }) {
  return (
    <div className="flex w-full items-center gap-4 rounded-md border border-gold-500/40 bg-gold-500/5 px-3 py-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gold-500/80">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-sm font-bold text-white/80"
            style={{ backgroundColor: team.colorHex + "44" }}
          >
            {team.shortCode}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-display text-lg font-bold text-white">{team.caption}</div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gold-400">Caption</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] uppercase tracking-wider text-white/50">Role</div>
        <div className="font-display text-sm font-bold text-white/80">Team caption</div>
      </div>
    </div>
  );
}

export function resolveTeamName(teams: Team[], teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  return teams.find((t) => t.id === teamId)?.name ?? null;
}
