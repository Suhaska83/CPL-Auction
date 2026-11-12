import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/types";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Props {
  players: Player[];
  sequence: string[];
  spinStartedAt: number;
  spinEndsAt: number;
  targetPlayerId: string;
}

/**
 * Horizontal “reel” — names and photos scroll until the random winner is revealed.
 */
export function RandomPickSpinner({
  players,
  sequence,
  spinStartedAt,
  spinEndsAt,
  targetPlayerId
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      setNow(Date.now());
      if (Date.now() < spinEndsAt + 400) {
        frame = requestAnimationFrame(loop);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [spinStartedAt, spinEndsAt]);

  const byId = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const duration = Math.max(1, spinEndsAt - spinStartedAt);
  const raw = Math.min(1, Math.max(0, (now - spinStartedAt) / duration));
  const progress = easeOutCubic(raw);
  const index = Math.min(sequence.length - 1, Math.floor(progress * (sequence.length - 1)));
  const highlightId = sequence[index] ?? targetPlayerId;
  const highlight = byId[highlightId];
  const target = byId[targetPlayerId];
  const done = now >= spinEndsAt;

  const reelItems = sequence.map((id, i) => {
    const p = byId[id];
    if (!p) return null;
    const active = !done && i === index;
    const won = done && id === targetPlayerId && i === sequence.length - 1;
    return (
      <div
        key={`${id}-${i}`}
        className={`flex w-36 shrink-0 flex-col items-center gap-2 px-2 transition-opacity ${
          active || won ? "opacity-100" : "opacity-45"
        }`}
      >
        <div
          className={`h-24 w-24 overflow-hidden rounded-full ring-2 ${
            active || won ? "ring-gold-400 shadow-glow" : "ring-white/20"
          }`}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-navy-800 text-xs text-white/50">
              {p.number}
            </div>
          )}
        </div>
        <div className="w-full truncate text-center text-xs font-semibold text-white">{p.name}</div>
      </div>
    );
  });

  const offsetPct = progress * Math.max(0, (sequence.length - 1) * 9);

  return (
    <div className="card overflow-hidden p-6 sm:p-8">
      <div className="text-center">
        <div className="text-sm uppercase tracking-[0.35em] text-gold-400/90">Random pick</div>
        <div className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
          {done ? "Player selected!" : "Choosing player…"}
        </div>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-lg border border-gold-500/30 bg-navy-900/80 py-4">
        <div
          className="flex will-change-transform"
          style={{
            transform: `translateX(calc(50% - 4.5rem - ${offsetPct}rem))`,
            transition: done ? "transform 0.35s ease-out" : "none"
          }}
        >
          {reelItems}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 border-x-2 border-gold-400/50 bg-gold-500/5" />
      </div>

      {(highlight || target) && (
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-gold-400 shadow-glow sm:h-40 sm:w-40">
            {(done ? target : highlight)?.photoUrl ? (
              <img
                src={(done ? target : highlight)!.photoUrl!}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-navy-800 text-2xl font-bold text-white/50">
                {(done ? target : highlight)?.number}
              </div>
            )}
          </div>
          <div className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
            #{(done ? target : highlight)?.number} {(done ? target : highlight)?.name}
          </div>
          <div className="text-sm text-white/60">{(done ? target : highlight)?.skill}</div>
          {done && (
            <p className="mt-3 text-sm text-gold-300/90">Opening bidding…</p>
          )}
        </div>
      )}
    </div>
  );
}
