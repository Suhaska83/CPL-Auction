import { useEffect, useRef, useState } from "react";
import { eligibleForAuction } from "@/lib/auction-eligibility";
import { OPENING_BID } from "@/lib/constants";
import { formatCompact, formatINR } from "@/lib/format";
import {
  beginRandomPick,
  cancelRandomPick,
  finalizeRandomPick,
  completeAuctionReset,
  markSold,
  markUnsold,
  placeBid,
  resetLive,
  startPlayer
} from "@/lib/auction-actions";
import { applyCplLiveSettings, syncCaptionPlayerIdsForTeams } from "@/lib/manage-actions";
import { forceReseed, seedIfEmpty } from "@/lib/seed";
import { WhatsAppNotify } from "@/components/whatsapp-notify";
import type {
  AuctionState,
  Player,
  PlayerCounts,
  Team,
  TeamStats,
  Tournament
} from "@/types";

interface LastSold {
  player: Player;
  team: TeamStats;
  price: number;
}

interface Props {
  tournament: Tournament;
  players: Player[];
  teams: TeamStats[];
  /** Normalized franchises (for auction pool / caption checks). */
  franchiseTeams: Team[];
  state: AuctionState;
  counts: PlayerCounts;
  currentPlayer: Player | null;
}

export function AdminPanel({
  tournament,
  players,
  teams,
  franchiseTeams,
  state,
  currentPlayer
}: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [lastSold, setLastSold] = useState<LastSold | null>(null);

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

  const eligible = eligibleForAuction(players, franchiseTeams);
  const isSpinning = state.pickPhase === "spinning";
  const canStartRandom =
    eligible.length > 0 && !state.currentPlayerId && !isSpinning;
  const finalizedSpin = useRef<number | null>(null);

  useEffect(() => {
    if (!isSpinning || !state.spinEndsAt || !state.spinStartedAt) return;
    if (finalizedSpin.current === state.spinStartedAt) return;

    const wait = state.spinEndsAt - Date.now();
    const timer = window.setTimeout(() => {
      finalizedSpin.current = state.spinStartedAt!;
      run(async () => {
        const p = await finalizeRandomPick();
        if (!p) throw new Error("Could not open bidding for the selected player.");
        setInfo(`🎯 #${p.number} ${p.name} selected — bidding is live.`);
      });
    }, Math.max(0, wait));

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, state.spinEndsAt, state.spinStartedAt]);

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

      {/* WhatsApp notify panel — appears after a player is marked SOLD. */}
      {lastSold && (
        <WhatsAppNotify
          tournament={tournament}
          player={lastSold.player}
          team={lastSold.team}
          soldPrice={lastSold.price}
          onDismiss={() => setLastSold(null)}
        />
      )}

      {/* Seed + reset controls */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto">
          <div className="font-display text-lg font-bold uppercase text-gold-400">
            Database
          </div>
          <div className="text-xs text-white/50">
            Seed sample data, or wipe everything to start fresh. Bid step:{" "}
            <span className="text-white/80">₹{formatINR(tournament.bidIncrement)}</span>
            {(tournament.tagline ?? "").trim() ? (
              <>
                {" "}
                · Tagline: <span className="text-white/80">{tournament.tagline}</span>
              </>
            ) : null}
          </div>
        </div>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() =>
            run(
              () => applyCplLiveSettings(),
              "Teams set to ₹20,000 budget; squad size set to 8."
            )
          }
        >
          Sync budget & squad
        </button>
        <button
          className="btn-ghost"
          disabled={busy}
          title="Match each team caption to one roster player by exact name (stores captionPlayerId)"
          onClick={() =>
            run(async () => {
              const { updated } = await syncCaptionPlayerIdsForTeams();
              if (updated === 0) {
                throw new Error(
                  "No caption links changed. Each team caption must match exactly one roster player name (see Manage Teams / Manage Players)."
                );
              }
              setInfo(`Linked ${updated} team caption(s) to roster player records.`);
            })
          }
        >
          Link caption players
        </button>
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
      </div>

      {/* Random player pick (live reel on Auction page) */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto min-w-[200px]">
          <div className="font-display text-lg font-bold uppercase text-gold-400">
            Start auction
          </div>
          <div className="text-xs text-white/50">
            {isSpinning
              ? "Random reel running on the Live Auction page… bidding opens when it stops."
              : "Picks a random player from the auction pool (team captions are excluded). After SOLD/UNSOLD, use Pick next randomly again."}
            {eligible.length > 0 ? (
              <span className="text-white/70"> {eligible.length} player(s) in the pool.</span>
            ) : (
              <span className="text-white/40"> No AVAILABLE players left.</span>
            )}
          </div>
        </div>
        <button
          className="btn-primary"
          disabled={busy || !canStartRandom}
          onClick={() =>
            run(async () => {
              await beginRandomPick();
            }, "🎲 Random pick started — watch the Live Auction screen.")
          }
        >
          {state.currentPlayerId ? "Pick next randomly" : "Start auction"}
        </button>
        <button
          className="btn-ghost"
          disabled={busy || !canStartRandom}
          title="Same as Start auction — use after each player is SOLD or UNSOLD"
          onClick={() =>
            run(async () => {
              await beginRandomPick();
            }, "🎲 Picking next random player…")
          }
        >
          Pick next randomly
        </button>
        {isSpinning && (
          <>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const p = await finalizeRandomPick();
                  if (!p) throw new Error("Nothing to finalize.");
                }, "Bidding opened for selected player.")
              }
            >
              Open bidding now
            </button>
            <button
              className="btn-danger text-xs"
              disabled={busy}
              onClick={() => run(() => cancelRandomPick(), "Random pick cancelled.")}
            >
              Cancel reel
            </button>
          </>
        )}
      </div>

      {/* Complete auction reset */}
      <div className="card border-red-900/40 bg-red-950/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[200px] flex-1">
            <div className="font-display text-lg font-bold uppercase text-red-300">
              Complete auction reset
            </div>
            <p className="mt-1 text-xs text-white/55">
              Stops any live bid or random reel. Clears bid history, last-sold banner, and
              returns every player to <strong className="text-white/80">AVAILABLE</strong> (no
              team assignments). Teams, captions, and player roster are not deleted.
            </p>
          </div>
          <button
            type="button"
            className="btn-danger shrink-0"
            disabled={busy}
            onClick={() => {
              if (
                !confirm(
                  "Complete auction reset?\n\n• Clears live auction & random pick\n• Removes all bids\n• Resets SOLD / UNSOLD players to AVAILABLE\n• Clears team purchases\n\nTeams and players stay in the database. This cannot be undone."
                )
              ) {
                return;
              }
              run(async () => {
                await completeAuctionReset();
                setLastSold(null);
              }, "Auction fully reset — all players are AVAILABLE again.");
            }}
          >
            Reset entire auction
          </button>
        </div>
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
                  ₹{" "}
                  {formatINR(
                    state.currentTeamId && state.currentBid > 0
                      ? state.currentBid
                      : OPENING_BID
                  )}
                  {!state.currentTeamId && (
                    <span className="text-white/50"> (opening)</span>
                  )}
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
                    const team = teams.find((t) => t.id === state.currentTeamId);
                    const price = state.currentBid;
                    const soldPlayer = currentPlayer;
                    run(async () => {
                      await markSold();
                      if (team) setLastSold({ player: soldPlayer, team, price });
                    }, `✅ SOLD ${soldPlayer.name} to ${team?.name} for ₹${formatINR(price)}.`);
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
            Teams — custom bid (₹{formatINR(OPENING_BID)} opening)
          </div>
          <div className="text-xs text-white/50">
            Type the amount for the team that is bidding, then click Bid.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
          {teams.map((t) => (
            <TeamBidCard
              key={t.id}
              team={t}
              busy={busy}
              currentBid={state.currentBid}
              hasBid={!!state.currentTeamId}
              hasPlayer={!!state.currentPlayerId}
              isHighest={state.currentTeamId === t.id}
              onBid={(amount) =>
                run(
                  () => placeBid(t.id, amount),
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
                <div className="text-[11px] text-white/50">{p.skill}</div>
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
  hasBid,
  hasPlayer,
  isHighest,
  onBid
}: {
  team: TeamStats;
  busy: boolean;
  currentBid: number;
  hasBid: boolean;
  hasPlayer: boolean;
  isHighest: boolean;
  onBid: (amount: number) => void;
}) {
  const suggested = hasBid && currentBid > 0 ? currentBid + 1 : OPENING_BID;
  const [amount, setAmount] = useState<number>(OPENING_BID);

  useEffect(() => {
    setAmount(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, hasBid, hasPlayer]);

  const disabled = busy || !hasPlayer;

  function submit() {
    if (!amount || amount < OPENING_BID) return;
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
              min={OPENING_BID}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={disabled}
              className="input pl-6"
              placeholder={`Min ₹${OPENING_BID}`}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={disabled || !amount || amount < OPENING_BID || exceedsMax}
            onClick={submit}
          >
            Bid
          </button>
        </div>
        <div
          className={`text-right text-[11px] ${exceedsMax ? "text-red-300" : "text-white/50"}`}
        >
          {formatCompact(amount)} {exceedsMax && "· over max bid"}
        </div>
      </div>
    </div>
  );
}

