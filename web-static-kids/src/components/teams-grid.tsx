import { CaptionSquadRow, SoldPlayerRow } from "@/components/sold-player-row";
import { formatCompact } from "@/lib/format";
import { resolveCaptionPhotoUrl } from "@/lib/team-utils";
import type { Player, TeamStats } from "@/types";

export function TeamsGrid({ teams, players }: { teams: TeamStats[]; players: Player[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {teams.map((t) => (
        <article key={t.id} className="card overflow-hidden">
          <div className="flex gap-4 p-4">
            <div
              className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-md ring-1 ring-panel-border"
              style={{ backgroundColor: t.colorHex + "22" }}
            >
              {t.logoUrl ? (
                <img src={t.logoUrl} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-xl font-bold text-white/70">
                  {t.shortCode}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="bg-navy-800 px-3 py-2 text-center font-display text-lg font-bold uppercase text-gold-400">
                {t.name} ({t.caption})
              </div>
              <div className="mt-2 divide-y divide-panel-border/60 rounded-md bg-panel-light/40">
                <Row label="Squad Size" value={`${t.squadCount}/${t.squadSize}`} />
                <Row
                  label="Balance"
                  value={`${formatCompact(t.balance)} / ${formatCompact(t.totalBudget)}`}
                  accent
                />
                <Row label="Max Bid" value={formatCompact(t.maxBid)} accent />
                <Row label="Reserve Bal." value={formatCompact(t.reserveBalance)} />
              </div>
            </div>
          </div>

          <div className="border-t border-panel-border/50 bg-navy-900/70 px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">
              Squad ({t.squadCount}/{t.squadSize})
            </div>
            <ul className="flex flex-col gap-2">
              <li>
                <CaptionSquadRow team={t} photoUrl={resolveCaptionPhotoUrl(t, players)} />
              </li>
              {t.players.map((p) => (
                <li key={p.id}>
                  <SoldPlayerRow
                    player={p}
                    soldPrice={p.soldPrice ?? 0}
                    teamName={null}
                  />
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}

function Row({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center">
      <div className="bg-navy-800/80 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/80">
        {label}
      </div>
      <div
        className={`px-3 py-2 font-display text-lg font-semibold ${
          accent ? "text-gold-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
