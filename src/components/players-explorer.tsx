"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { formatCompact } from "@/lib/format";

type PlayerRow = {
  id: string;
  number: number;
  name: string;
  age: number | null;
  photoUrl: string | null;
  skill: string;
  matches: number;
  runs: number;
  wickets: number;
  points: number;
  basePrice: number;
  status: "AVAILABLE" | "ON_AUCTION" | "SOLD" | "UNSOLD";
  soldPrice: number | null;
  team: { name: string; shortCode: string; colorHex: string; logoUrl: string | null } | null;
};

type Filter = "ALL" | "AVAILABLE" | "SOLD" | "UNSOLD";

export function PlayersExplorer({
  initial
}: {
  initial: { players: PlayerRow[]; counts: { all: number; available: number; sold: number; unsold: number } };
}) {
  const [players, setPlayers] = useState(initial.players);
  const [counts, setCounts] = useState(initial.counts);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Light polling to stay in sync with auction changes.
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/players", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          setPlayers(data.players);
          setCounts(data.counts);
        }
      } catch {
        /* noop */
      }
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (filter !== "ALL" && p.status !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [players, filter, search]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <FilterTab label={`All`} count={counts.all} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        <FilterTab
          label={`Available`}
          count={counts.available}
          active={filter === "AVAILABLE"}
          onClick={() => setFilter("AVAILABLE")}
          tone="neutral"
        />
        <FilterTab
          label={`Sold`}
          count={counts.sold}
          active={filter === "SOLD"}
          onClick={() => setFilter("SOLD")}
          tone="success"
        />
        <FilterTab
          label={`Unsold`}
          count={counts.unsold}
          active={filter === "UNSOLD"}
          onClick={() => setFilter("UNSOLD")}
          tone="danger"
        />

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Player"
              className="w-64 rounded-md border border-panel-border bg-panel px-3 py-2 pr-9 text-sm text-white placeholder:text-white/40 focus:border-gold-500 focus:outline-none"
            />
            <svg
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <PlayerCard key={p.id} p={p} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full grid place-items-center rounded-lg border border-dashed border-panel-border/60 p-10 text-white/50">
            No players match your filter.
          </div>
        )}
      </div>
    </section>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  tone
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "danger" | "neutral";
}) {
  const baseTone =
    tone === "success"
      ? "border-green-700/50 text-green-300"
      : tone === "danger"
        ? "border-red-700/50 text-red-300"
        : "border-panel-border text-white";
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors",
        active
          ? "border-gold-500 bg-gold-500/10 text-gold-400"
          : `bg-panel/80 hover:bg-panel-light ${baseTone}`
      )}
    >
      {label} — {count}
    </button>
  );
}

function PlayerCard({ p }: { p: PlayerRow }) {
  return (
    <article className="card overflow-hidden">
      <div className="flex">
        <div className="relative w-1/3 shrink-0">
          <div className="aspect-square w-full overflow-hidden bg-panel-light">
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-white/40">N/A</div>
            )}
          </div>
          <div className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-red text-xs font-bold text-white shadow-inner">
            {p.number}
          </div>
        </div>
        <div className="flex flex-1 flex-col divide-y divide-panel-border/60">
          <Row label="Name" value={p.name} accent />
          <Row label="Age" value={p.age ? String(p.age) : "-"} />
          <Row label="Point" value={p.points ? String(p.points) : "-"} />
          <Row label="Skill" value={p.skill} accent />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-panel-border/60 bg-navy-900/70 px-3 py-2 text-xs">
        <StatusBadge status={p.status} />
        {p.status === "SOLD" ? (
          <div className="text-right">
            <div className="text-white/50">
              Sold to <span className="text-white">{p.team?.name ?? "-"}</span>
            </div>
            <div className="font-display text-sm font-bold text-gold-400">
              {p.soldPrice ? formatCompact(p.soldPrice) : "-"}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-white/50">Base</div>
            <div className="font-display text-sm font-bold text-white">
              {formatCompact(p.basePrice)}
            </div>
          </div>
        )}
      </div>
    </article>
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
    <div className="grid grid-cols-[80px_1fr] items-center">
      <div className="bg-navy-800/80 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80">
        {label}
      </div>
      <div
        className={clsx(
          "px-3 py-2 text-sm font-semibold",
          accent ? "text-gold-400" : "text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PlayerRow["status"] }) {
  const map: Record<PlayerRow["status"], string> = {
    AVAILABLE: "bg-navy-700 text-white/80 ring-panel-border",
    ON_AUCTION: "bg-gold-500/20 text-gold-300 ring-gold-500/60 animate-pulse",
    SOLD: "bg-green-900/50 text-green-300 ring-green-700/50",
    UNSOLD: "bg-red-900/50 text-red-300 ring-red-700/50"
  };
  return (
    <span className={`chip ring-1 ${map[status]}`}>{status.replace("_", " ")}</span>
  );
}
