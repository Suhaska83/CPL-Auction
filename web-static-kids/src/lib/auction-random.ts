import { eligibleForAuction } from "@/lib/auction-eligibility";
import type { Player, Team } from "@/types";

export const RANDOM_SPIN_MS = 5_500;

export function eligibleForRandomPick(players: Player[], teams: Team[]): Player[] {
  return eligibleForAuction(players, teams);
}

export function pickRandomPlayer(players: Player[], teams: Team[]): Player | null {
  const pool = eligibleForRandomPick(players, teams);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export type SpinReelPlan = {
  sequence: string[];
  /** Index in `sequence` where the winner is shown when the reel stops. */
  landIndex: number;
  /** Extra full reels to scroll before stopping (varies each pick). */
  extraLaps: number;
};

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Fill `count` reel tiles from `pool` without adjacent duplicate ids when possible. */
function buildFillerIds(pool: string[], count: number, avoidAdjacent: string | null): string[] {
  if (count <= 0) return [];
  const fillerPool = pool.length ? pool : avoidAdjacent ? [avoidAdjacent] : [];
  if (!fillerPool.length) return [];

  const out: string[] = [];
  let deck = shuffleIds(fillerPool);
  let deckPos = 0;
  let prev = avoidAdjacent;

  for (let n = 0; n < count; n++) {
    if (deckPos >= deck.length) {
      prev = out[out.length - 1] ?? prev;
      deck = shuffleIds(fillerPool);
      deckPos = 0;
      if (fillerPool.length > 1 && deck[0] === prev) {
        [deck[0], deck[1]] = [deck[1]!, deck[0]!];
      }
    }

    let id = deck[deckPos++]!;
    if (fillerPool.length > 1 && id === prev) {
      const swapAt = deck.findIndex((candidate, idx) => idx >= deckPos && candidate !== prev);
      if (swapAt >= 0) {
        const at = deckPos - 1;
        [deck[at], deck[swapAt]] = [deck[swapAt]!, deck[at]!];
        id = deck[at]!;
      }
    }
    out.push(id);
    prev = id;
  }
  return out;
}

function placeAt(sequence: string[], landIndex: number, filler: string[], offset: number) {
  for (let i = 0; i < filler.length; i++) {
    const idx = offset + i;
    if (idx === landIndex) continue;
    sequence[idx] = filler[i]!;
  }
}

/** Build a scroll sequence with the winner at a random stop position (not always the last tile). */
export function buildSpinSequence(
  eligible: Player[],
  winner: Player,
  length = 28
): SpinReelPlan {
  const ids = [...new Set(eligible.map((p) => p.id).filter(Boolean))];
  const seqLength = Math.max(length, 12);
  const landIndex = Math.floor(Math.random() * seqLength);
  const extraLaps = 1 + Math.floor(Math.random() * 3);

  if (!ids.length) {
    return { sequence: [winner.id], landIndex: 0, extraLaps: 0 };
  }

  const fillerPool = ids.filter((id) => id !== winner.id);
  const poolForTiles = fillerPool.length ? fillerPool : [winner.id];

  const sequence: string[] = new Array(seqLength);
  sequence[landIndex] = winner.id;

  if (ids.length >= seqLength) {
    const others = shuffleIds(ids.filter((id) => id !== winner.id)).slice(0, seqLength - 1);
    let oi = 0;
    for (let i = 0; i < seqLength; i++) {
      if (i !== landIndex) sequence[i] = others[oi++]!;
    }
    return { sequence, landIndex, extraLaps };
  }

  const before = buildFillerIds(poolForTiles, landIndex, null);
  placeAt(sequence, landIndex, before, 0);

  const afterStart = landIndex + 1;
  const afterCount = seqLength - afterStart;
  const after = buildFillerIds(
    poolForTiles,
    afterCount,
    landIndex > 0 ? sequence[landIndex - 1]! : null
  );
  placeAt(sequence, landIndex, after, afterStart);

  return { sequence, landIndex, extraLaps };
}

/** Reel highlight index while spinning; lands on `landIndex` when progress → 1. */
export function spinReelIndex(
  progress: number,
  seqLength: number,
  landIndex: number,
  extraLaps: number
): number {
  const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 3);
  if (eased >= 1) return landIndex;
  if (seqLength <= 0) return 0;

  const totalSteps = extraLaps * seqLength + landIndex;
  const step = Math.min(totalSteps, Math.floor(eased * totalSteps));

  if (eased >= 0.9) {
    const coarse = step % seqLength;
    const t = (eased - 0.9) / 0.1;
    return Math.round(t * landIndex + (1 - t) * coarse);
  }
  return step % seqLength;
}
