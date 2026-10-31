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

/** Build a scroll sequence ending on the chosen winner (for the live reel animation). */
export function buildSpinSequence(eligible: Player[], winner: Player, length = 28): string[] {
  if (!eligible.length) return [winner.id];
  const ids = eligible.map((p) => p.id);
  const seq: string[] = [];
  const body = Math.max(length - 1, 12);
  for (let i = 0; i < body; i++) {
    seq.push(ids[Math.floor(Math.random() * ids.length)]!);
  }
  seq.push(winner.id);
  return seq;
}
