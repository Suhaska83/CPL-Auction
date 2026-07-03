"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { formatINR, formatCompact } from "@/lib/format";
import type { LiveSnapshot } from "@/lib/auction-service";

type PlayerLite = {
  id: string;
  number: number;
  name: string;
  skill: string;
  basePrice: number;
  status: string;
  photoUrl: string | null;
};

export function AdminPanel({
  initialPlayers,
  initialSnapshot
}: {
  initialPlayers: PlayerLite[];
  initialSnapshot: LiveSnapshot;
}) {
  const [key, setKey] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("adminKey") ?? "" : ""
  );
  const [snap, setSnap] = useState<LiveSnapshot>(initialSnapshot);
  const [players, setPlayers] = useState<PlayerLite[]>(initialPlayers);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const socket: Socket = io({ path: "/socket.io" });
    socket.on("state", (payload: LiveSnapshot) => setSnap(payload));
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("adminKey", key);
  }, [key]);

  async function refreshPlayers() {
    const r = await fetch("/api/players");
    if (r.ok) {
      const data = await r.json();
      const eligible = (data.players as PlayerLite[]).filter(
        (p) => p.status !== "SOLD"
      );
      setPlayers(eligible);
    }
  }

  async function call(url: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-key": key
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setErr(data.error ?? `Request failed (${r.status})`);
      } else {
        const data = (await r.json()) as LiveSnapshot;
        setSnap(data);
        await refreshPlayers();
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const currentPlayerId = snap.state.currentPlayerId;
  const currentTeamId = snap.state.currentTeamId;
  const activePlayers = players.filter((p) => p.status !== "SOLD");

  return (
    <div className="space-y-6">
      {/* Auth */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm text-white/70">Admin Key</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter admin key"
          className="w-64 rounded-md border border-panel-border bg-navy-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
        />
        <div className="text-xs text-white/50">
          Set via <code className="rounded bg-navy-800 px-1 py-0.5">ADMIN_PASSWORD</code> env var (default:
          <code className="ml-1 rounded bg-navy-800 px-1 py-0.5">admin123</code>).
        </div>
      </div>

      {err && (
        <div className="card border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {/* Current state */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-xl font-bold uppercase text-gold-400">
            Current Player
          </div>
          <button
            className="btn-ghost text-xs"
            onClick={() => call("/api/admin/reset")}
            disabled={busy}
          >
            Reset live state
          </button>
        </div>
        {snap.currentPlayer ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-gold-500">
              {snap.currentPlayer.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={snap.currentPlayer.photoUrl}
                  alt={snap.currentPlayer.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">
                #{snap.currentPlayer.number} {snap.currentPlayer.name}
              </div>
              <div className="text-sm text-white/60">{snap.currentPlayer.skill}</div>
              <div className="mt-1 text-sm">
                Current bid:{" "}
                <span className="font-bold text-gold-400">
                  ₹ {formatINR(snap.state.currentBid || snap.currentPlayer.basePrice)}
                </span>{" "}
                {snap.currentTeam && (
                  <span className="text-white/70">by {snap.currentTeam.name}</span>
                )}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => call("/api/admin/sold")}
                className="btn-success"
                disabled={busy || !currentTeamId}
              >
                Mark SOLD
              </button>
              <button
                onClick={() => call("/api/admin/unsold")}
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
          Teams — Tap to bid
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {snap.teams.map((t) => (
            <button
              key={t.id}
              onClick={() => call("/api/admin/bid", { teamId: t.id })}
              disabled={busy || !currentPlayerId}
              className="card flex flex-col items-start gap-1 p-3 text-left transition-colors hover:bg-panel-light disabled:opacity-40"
            >
              <div className="flex w-full items-center gap-2">
                <div
                  className="grid h-10 w-10 place-items-center rounded"
                  style={{ backgroundColor: t.colorHex + "33" }}
                >
                  {t.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logoUrl} alt={t.name} className="h-full w-full object-cover rounded" />
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
              {currentTeamId === t.id && (
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
          Player Queue ({activePlayers.length} eligible)
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {activePlayers.map((p) => (
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
                onClick={() => call("/api/admin/start", { playerId: p.id })}
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
