import { getTeamStats } from "@/lib/auction-service";
import { formatCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await getTeamStats();
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">Teams</h1>
        <div className="text-sm text-white/60">
          {teams.length} franchises · Squad size {teams[0]?.squadSize ?? 13}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {teams.map((t) => (
          <article key={t.id} className="card overflow-hidden">
            <div className="flex gap-4 p-4">
              <div
                className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-md ring-1 ring-panel-border"
                style={{ backgroundColor: t.colorHex + "22" }}
              >
                {t.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logoUrl} alt={t.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-bold text-white/70">
                    {t.shortCode}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="bg-navy-800 px-3 py-2 text-center font-display text-lg font-bold uppercase text-gold-400">
                  {t.name} ({t.owner})
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

            {t.players.length > 0 && (
              <div className="border-t border-panel-border/50 bg-navy-900/70 px-4 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">
                  Purchased Players ({t.players.length})
                </div>
                <ul className="flex flex-wrap gap-2">
                  {t.players.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-md bg-panel px-2 py-1 text-xs text-white/80 ring-1 ring-panel-border"
                    >
                      {p.name} · <span className="text-white/50">{p.skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
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
