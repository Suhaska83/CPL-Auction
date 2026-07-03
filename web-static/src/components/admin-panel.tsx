import { useState } from "react";
import { formatCompact, formatINR } from "@/lib/format";
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

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const eligible = players.filter((p) => p.status !== "SOLD");

  return (
    <div className="space-y-6">
      {err && (
        <div className="card border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {info && (
        <div className="card border-green-700/50 bg-green-900/30 p-3 text-sm text-green-300">
          {info}
        </div>
      )}

      {/* Seed + reset controls */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto">
          <div className="font-display text-lg font-bold uppercase text-gold-400">
            Database
          </div>
          <div className="text-xs text-white/50">
            One-time seed for a fresh Firebase project. Re-seed resets ALL data.
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
            run(async () => {
              await resetLive(true);
              setInfo("All players reset to AVAILABLE.");
            });
          }}
        >
          Full reset
        </button>
      </div>

      {/* Current state */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-xl font-bold uppercase text-gold-400">
            Current Player
          </div>
          <button
            className="btn-ghost text-xs"
            onClick={() => run(() => resetLive(false))}
            disabled={busy}
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
                {state.currentTeamId && (
                  <span className="text-white/70">
                    by {teams.find((t) => t.id === state.currentTeamId)?.name}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => run(markSold)}
                className="btn-success"
                disabled={busy || !state.currentTeamId}
              >
                Mark SOLD
              </button>
              <button
                onClick={() => run(markUnsold)}
                className="btn-danger"
                disabled={busy}
              >
                Mark UNSOLD
              </button>
            </div>
          </div>
        ) : (
          <div className="text-white/50">No player currently on auction.</div>
        )}
      </div>

      {/* Bidding */}
      <div className="card p-4">
        <div className="mb-3 font-display text-xl font-bold uppercase text-gold-400">
          Teams — Tap to bid (+{formatCompact(tournament.bidIncrement)})
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => run(() => placeBid(t.id, tournament.bidIncrement))}
              disabled={busy || !state.currentPlayerId}
              className="card flex flex-col items-start gap-1 p-3 text-left transition-colors hover:bg-panel-light disabled:opacity-40"
            >
              <div className="flex w-full items-center gap-2">
                <div
                  className="grid h-10 w-10 place-items-center rounded"
                  style={{ backgroundColor: t.colorHex + "33" }}
                >
                  {t.logoUrl ? (
                    <img
                      src={t.logoUrl}
                      alt={t.name}
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold">{t.shortCode}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-white/50">Owner {t.owner}</div>
                </div>
              </div>
              <div className="mt-1 grid w-full grid-cols-3 gap-1 text-[10px]">
                <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
                  <div className="text-white/50">Balance</div>
                  <div className="text-white">{formatCompact(t.balance)}</div>
                </div>
                <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
                  <div className="text-white/50">Max Bid</div>
                  <div className="text-gold-400">{formatCompact(t.maxBid)}</div>
                </div>
                <div className="rounded bg-navy-800 px-1.5 py-1 text-center">
                  <div className="text-white/50">Squad</div>
                  <div className="text-white">
                    {t.squadCount}/{t.squadSize}
                  </div>
                </div>
              </div>
              {state.currentTeamId === t.id && (
                <div className="mt-1 text-[11px] font-bold uppercase text-gold-400">
                  Highest bidder
                </div>
              )}
            </button>
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
                onClick={() => run(() => startPlayer(p.id))}
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
