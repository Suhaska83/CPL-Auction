import { formatINR } from "@/lib/format";
import type { Player, PlayerCounts, TeamStats } from "@/types";

interface Props {
  currentPlayer: Player | null;
  currentTeam: TeamStats | null;
  currentBid: number;
  isRunning: boolean;
  counts: PlayerCounts;
}

export function AuctionLiveView({
  currentPlayer,
  currentTeam,
  currentBid,
  isRunning,
  counts
}: Props) {
  if (!currentPlayer) {
    return (
      <div className="card grid min-h-[380px] place-items-center p-10 text-center">
        <div>
          <div className="text-sm uppercase tracking-widest text-white/50">Auction status</div>
          <div className="mt-2 font-display text-3xl font-bold text-gold-400">
            Waiting for next player…
          </div>
          <p className="mt-3 max-w-lg text-white/60">
            The auctioneer hasn't picked a player yet. The screen will update live the moment
            bidding starts.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat label="Sold" value={counts.sold} tone="success" />
            <MiniStat label="Unsold" value={counts.unsold} tone="danger" />
            <MiniStat label="Available" value={counts.available} tone="neutral" />
          </div>
        </div>
      </div>
    );
  }

  const bidAmount = currentBid > 0 ? currentBid : currentPlayer.basePrice;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      {/* Player card */}
      <div className="animate-slide-in card overflow-hidden p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-gold-400/70 shadow-glow sm:h-40 sm:w-40">
              {currentPlayer.photoUrl ? (
                <img
                  src={currentPlayer.photoUrl}
                  alt={currentPlayer.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-panel-light text-white/70">
                  N/A
                </div>
              )}
            </div>
            <div className="absolute -left-1 -top-1 grid h-9 w-9 place-items-center rounded-full bg-gold-500 text-sm font-bold text-navy-950 shadow-card">
              {currentPlayer.number}
            </div>
          </div>

          <div className="flex-1">
            <div
              className="w-full rounded-md bg-gradient-to-r from-gold-500 to-amber-400 px-4 py-3 font-display text-2xl font-bold uppercase text-navy-950 sm:text-4xl"
              style={{ clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)" }}
            >
              {currentPlayer.name}
            </div>
            <div
              className="mt-2 w-full rounded-md bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2 font-display text-lg font-bold uppercase text-navy-950 sm:text-2xl"
              style={{ clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)" }}
            >
              {currentPlayer.skill}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <StatChip label="Match" value={currentPlayer.matches} />
          <StatChip label="Run" value={currentPlayer.runs} />
          <StatChip label="Wicket" value={currentPlayer.wickets} />
          <StatChip label="Points" value={currentPlayer.points} />
        </div>
      </div>

      {/* Team + bid */}
      <div className="animate-slide-in card flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-md bg-panel-light ring-1 ring-panel-border sm:h-28 sm:w-28">
              {currentTeam?.logoUrl ? (
                <img src={currentTeam.logoUrl} alt={currentTeam.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-white/60">
                  {currentTeam?.shortCode ?? "—"}
                </span>
              )}
            </div>
            <div className="absolute -right-2 -top-2 rounded-md bg-navy-800 px-2 py-1 text-xs font-bold text-gold-400 ring-1 ring-panel-border">
              PL. {currentTeam ? currentTeam.squadCount + 1 : "-"}/{currentTeam?.squadSize ?? 13}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
              {currentTeam ? `${currentTeam.name} (${currentTeam.owner})` : "Awaiting bid"}
            </div>
            <div className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold text-gold-400 sm:text-4xl">
              <CoinIcon />
              {formatINR(bidAmount)}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <div className="rounded-md bg-navy-800/80 px-4 py-2 text-right">
            <span className="mr-2 rounded bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white/70">
              Max Bid
            </span>
            <span className="font-display text-lg font-bold text-white">
              {currentTeam ? formatINR(currentTeam.maxBid) : "—"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatusPill label="Sold" value={counts.sold} tone="success" />
            <StatusPill label="UnSold" value={counts.unsold} tone="danger" />
            <StatusPill label="Available" value={counts.available} tone="neutral" />
          </div>
        </div>

        <div className="mt-4 text-xs text-white/50">
          {isRunning ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse-glow rounded-full bg-brand-red" />
              Live bidding in progress
            </span>
          ) : (
            <span>Bidding paused</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center overflow-hidden rounded-md ring-1 ring-panel-border">
      <span className="bg-navy-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
        {label}
      </span>
      <span className="bg-brand-red px-3 py-1 font-display text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "bg-green-900/60 text-green-300 ring-green-700/60"
      : tone === "danger"
        ? "bg-red-900/50 text-red-300 ring-red-700/60"
        : "bg-navy-800 text-white/80 ring-panel-border";
  return (
    <div className={`rounded-md px-3 py-2 text-center ring-1 ${cls}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "text-green-300"
      : tone === "danger"
        ? "text-red-300"
        : "text-white";
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className={`font-display text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-gold-400" fill="currentColor">
      <circle cx="12" cy="12" r="10" opacity="0.95" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="#0a1338"
        fontFamily="Rajdhani, sans-serif"
        fontWeight="800"
        fontSize="12"
      >
        ₹
      </text>
    </svg>
  );
}
