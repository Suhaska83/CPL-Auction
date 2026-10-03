import { useEffect, useState } from "react";
import { CRORE, formatCompact, formatINR, LAKH } from "@/lib/format";
import {
  markSold,
  markUnsold,
  placeBid,
  resetLive,
  startPlayer
} from "@/lib/auction-actions";
import { forceReseed, seedIfEmpty } from "@/lib/seed";
import type {
  AuctionState,
  Player,
  PlayerCounts,
  TeamStats,
  Tournament
} from "@/types";

interface Props {
  tournament: Tournament;
  players: Player[];
  teams: TeamStats[];
  state: AuctionState;
  counts: PlayerCounts;
  currentPlayer: Player | null;
}

export function AdminPanel({
  tournament,
  players,
  teams,
  state,
  currentPlayer
}: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, successMsg?: string) {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await fn();
      if (successMsg) setInfo(successMsg);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[admin action]", e);
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const eligible = players.filter((p) => p.status !== "SOLD");

  return (
    <div className="space-y-6">
      {/* Sticky error / info banner so the admin can't miss what happened */}
      {(err || info) && (
        <div
          className={`sticky top-20 z-30 flex items-start gap-3 rounded-md border p-3 text-sm shadow-card ${
            err
              ? "border-red-700/70 bg-red-900/50 text-red-100"
              : "border-green-700/70 bg-green-900/50 text-green-100"
          }`}
        >
          <div className="flex-1 whitespace-pre-wrap">{err ?? info}</div>
          <button
            className="text-xs opacity-80 hover:opacity-100"
            onClick={() => {
              setErr(null);
              setInfo(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Seed + reset controls */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto">
          <div className="font-display text-lg font-bold uppercase text-gold-400">
            Database
          </div>
          <div className="text-xs text-white/50">
            Seed sample data, or wipe everything to start fresh.
          </div>
        </div>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await seedIfEmpty();
              setInfo(r.message);
            })
          }
        >
          Seed if empty
        </button>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm("Re-seed will DELETE all teams, players, bids. Continue?")) return;
            run(async () => {
              const r = await forceReseed();
              setInfo(r.message);
            });
          }}
        >
          Re-seed (destructive)
        </button>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm("This will reset ALL players to AVAILABLE and clear bids. Continue?")) return;
            run(() => resetLive(true), "All players reset to AVAILABLE.");
          }}
        >
          Full reset
        </button>
      </div>

      {/* Current state + SOLD/UNSOLD */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-xl font-bold uppercase text-gold-400">
            Current Player
          </div>
          <button
            className="btn-ghost text-xs"
            onClick={() => run(() => resetLive(false), "Live auction paused.")}
            disabled={busy || !state.currentPlayerId}
          >
            Pause / reset live
          </button>
        </div>
        {currentPlayer ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-gold-500">
              {currentPlayer.photoUrl && (
                <img
                  src={currentPlayer.photoUrl}
                  alt={currentPlayer.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">
                #{currentPlayer.number} {currentPlayer.name}
              </div>
              <div className="text-sm text-white/60">{currentPlayer.skill}</div>
              <div className="mt-1 text-sm">
                Current bid:{" "}
                <span className="font-bold text-gold-400">
                  ₹ {formatINR(state.currentBid || currentPlayer.basePrice)}
                </span>{" "}
                {state.currentTeamId ? (
                  <span className="text-white/70">
                    by {teams.find((t) => t.id === state.currentTeamId)?.name}
                  </span>
                ) : (
                  <span className="text-white/50">(no bids yet)</span>
                )}
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const teamName = teams.find((t) => t.id === state.currentTeamId)?.name;
                    run(
                      markSold,
                      `✅ SOLD ${currentPlayer.name} to ${teamName} for ₹${formatINR(state.currentBid)}.`
                    );
                  }}
                  className="btn-success"
                  disabled={busy || !state.currentTeamId}
                  title={
                    !state.currentTeamId
                      ? "No bids yet — a team must bid before you can mark the player sold."
                      : "Award this player to the highest bidder"
                  }
                >
                  Mark SOLD
                </button>
                <button
                  onClick={() =>
                    run(markUnsold, `❎ Marked ${currentPlayer.name} as UNSOLD.`)
                  }
                  className="btn-danger"
                  disabled={busy}
                  title="Mark this player unsold and clear the live state"
                >
                  Mark UNSOLD
                </button>
              </div>
              {!state.currentTeamId && (
                <div className="text-[11px] text-white/50">
                  SOLD requires at least one bid.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/50">
            No player currently on auction. Pick a player from the queue below and click
            <b className="text-gold-400"> Start</b>.
          </div>
        )}
      </div>

      {/* Bidding */}
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-xl font-bold uppercase text-gold-400">
            Teams — type a bid or use quick buttons
          </div>
          <div className="text-xs text-white/50">
            Default step +{formatCompact(tournament.bidIncrement)}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
          {teams.map((t) => (
            <TeamBidCard
              key={t.id}
              team={t}
              busy={busy}
              currentBid={state.currentBid}
              basePrice={currentPlayer?.basePrice ?? 0}
              bidIncrement={tournament.bidIncrement}
              hasPlayer={!!state.currentPlayerId}
              isHighest={state.currentTeamId === t.id}
              onBid={(amount) =>
                run(
                  () => placeBid(t.id, tournament.bidIncrement, amount),
                  `💰 ${t.name} bid ₹${formatINR(amount)}.`
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Player queue */}
      <div className="card p-4">
        <div className="mb-3 font-display text-xl font-bold uppercase text-gold-400">
          Player Queue ({eligible.length} eligible)
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {eligible.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-md border border-panel-border bg-panel/80 p-2"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-red text-xs font-bold text-white">
                {p.number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                <div className="text-[11px] text-white/50">
                  {p.skill} · Base {formatCompact(p.basePrice)}
                </div>
              </div>
              <button
                onClick={() =>
                  run(() => startPlayer(p.id), `▶ Started bidding on ${p.name}.`)
                }
                className="btn-primary text-xs"
                disabled={busy}
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Per-team bid card ─────────────────────────────────────────────
function TeamBidCard({
  team,
  busy,
  currentBid,
  basePrice,
  bidIncrement,
  hasPlayer,
  isHighest,
  onBid
}: {
  team: TeamStats;
  busy: boolean;
  currentBid: number;
  basePrice: number;
  bidIncrement: number;
  hasPlayer: boolean;
  isHighest: boolean;
  onBid: (amount: number) => void;
}) {
  // Default suggested bid = next step above current, or base price if first bid.
  const suggested = currentBid > 0 ? currentBid + bidIncrement : basePrice;
  const [amount, setAmount] = useState<number>(suggested);

  // Keep the input in sync when the live state changes (new player, new bid, etc.)
  useEffect(() => {
    setAmount(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, basePrice, bidIncrement]);

  const disabled = busy || !hasPlayer;

  function bump(delta: number) {
    setAmount((v) => Math.max(0, (Number.isFinite(v) ? v : 0) + delta));
  }
  function submit() {
    if (!amount || amount <= 0) return;
    onBid(amount);
  }

  const exceedsMax = amount > team.maxBid;

  return (
    <div
      className={`card p-3 ${
        isHighest ? "border-gold-500/70 bg-gold-500/5" : ""
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex w-full items-center gap-2">
        <div
          className="grid h-10 w-10 place-items-center rounded"
          style={{ backgroundColor: team.colorHex + "33" }}
        >
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="h-full w-full rounded object-cover"
            />
          ) : (
            <span className="text-xs font-bold">{team.shortCode}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">{team.name}</div>
          <div className="text-xs text-white/50">Owner {team.owner}</div>
        </div>
        {isHighest && (
          <span className="rounded bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-300">
            Highest
          </span>
        )}
      </div>

      <div className="mt-2 grid w-full grid-cols-3 gap-1 text-[10px]">
        <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
          <div className="text-white/50">Balance</div>
          <div className="text-white">{formatCompact(team.balance)}</div>
        </div>
        <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
          <div className="text-white/50">Max Bid</div>
          <div className="text-gold-400">{formatCompact(team.maxBid)}</div>
        </div>
        <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
          <div className="text-white/50">Squad</div>
          <div className="text-white">
            {team.squadCount}/{team.squadSize}
          </div>
        </div>
      </div>

      {/* Bid controls */}
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-white/50">
              ₹
            </span>
            <input
              type="number"
              min={0}
              step={LAKH}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={disabled}
              className="input pl-6"
              placeholder="Enter amount"
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={disabled || !amount || amount <= 0}
            onClick={submit}
          >
            Bid
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <QuickBtn onClick={() => bump(25 * LAKH)} disabled={disabled}>+25 L</QuickBtn>
          <QuickBtn onClick={() => bump(50 * LAKH)} disabled={disabled}>+50 L</QuickBtn>
          <QuickBtn onClick={() => bump(1 * CRORE)} disabled={disabled}>+1 Cr</QuickBtn>
          <QuickBtn onClick={() => setAmount(team.maxBid)} disabled={disabled}>
            = Max
          </QuickBtn>
          <span
            className={`ml-auto text-[11px] ${exceedsMax ? "text-red-300" : "text-white/50"}`}
          >
            {formatCompact(amount)} {exceedsMax && "· over max bid"}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickBtn({
  onClick,
  disabled,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded bg-navy-800 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-navy-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
