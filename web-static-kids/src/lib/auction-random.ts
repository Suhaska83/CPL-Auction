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

/** Build a scroll sequence with the winner at a random stop position (not always the last tile). */
export function buildSpinSequence(
  eligible: Player[],
  winner: Player,
  length = 28
): SpinReelPlan {
  if (!eligible.length) {
    return { sequence: [winner.id], landIndex: 0, extraLaps: 0 };
  }
  const ids = eligible.map((p) => p.id);
  const seqLength = Math.max(length, 12);
  const landIndex = Math.floor(Math.random() * seqLength);
  const extraLaps = 1 + Math.floor(Math.random() * 3);

  const sequence: string[] = [];
  for (let i = 0; i < seqLength; i++) {
    sequence.push(
      i === landIndex ? winner.id : ids[Math.floor(Math.random() * ids.length)]!
    );
  }
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
