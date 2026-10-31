import { ref, get, set, update, push } from "firebase/database";
import { getFirebase } from "@/firebase";
import { pickNextEligiblePlayer } from "@/lib/auction-queue";
import {
  buildSpinSequence,
  eligibleForRandomPick,
  pickRandomPlayer,
  RANDOM_SPIN_MS
} from "@/lib/auction-random";
import type { Player, Team, AuctionState } from "@/types";

function playersRecordToList(raw: Record<string, Player> | null): Player[] {
  if (!raw) return [];
  return Object.entries(raw).map(([id, p]) => ({ ...p, id }));
}

function clearedState(autoPick = false): AuctionState {
  return {
    currentPlayerId: null,
    currentBid: 0,
    currentTeamId: null,
    isRunning: false,
    autoPick,
    pickPhase: "idle",
    spinStartedAt: null,
    spinEndsAt: null,
    spinTargetPlayerId: null,
    spinSequence: null
  };
}

// ─── Start bidding on a player ─────────────────────────────────────
export async function startPlayer(playerId: string) {
  const { db } = getFirebase();
  const psnap = await get(ref(db, `players/${playerId}`));
  const player = psnap.val() as Player | null;
  if (!player) throw new Error("Player not found");
  if (player.status === "SOLD") throw new Error("Player already sold");

  const stateSnap = await get(ref(db, "state"));
  const prev = (stateSnap.val() as AuctionState | null) ?? clearedState(false);

  await update(ref(db), {
    [`players/${playerId}/status`]: "ON_AUCTION",
    state: {
      currentPlayerId: playerId,
      currentBid: player.basePrice,
      currentTeamId: null,
      isRunning: true,
      autoPick: prev.autoPick === true,
      pickPhase: "idle",
      spinStartedAt: null,
      spinEndsAt: null,
      spinTargetPlayerId: null,
      spinSequence: null
    } satisfies AuctionState
  });
}

/** Start the random scroll animation; admin finalizes → live bidding. */
export async function beginRandomPick(): Promise<Player> {
  const { db } = getFirebase();
  const [playersSnap, stateSnap] = await Promise.all([
    get(ref(db, "players")),
    get(ref(db, "state"))
  ]);
  const state = (stateSnap.val() as AuctionState | null) ?? clearedState(false);
  if (state.currentPlayerId) {
    throw new Error("Mark the current player SOLD or UNSOLD before picking again.");
  }
  if (state.pickPhase === "spinning") {
    throw new Error("Random pick already running.");
  }

  const players = playersRecordToList(playersSnap.val() as Record<string, Player> | null);
  const winner = pickRandomPlayer(players);
  if (!winner) throw new Error("No AVAILABLE players left to pick.");

  const eligible = eligibleForRandomPick(players);
  const now = Date.now();
  const sequence = buildSpinSequence(eligible, winner);

  await update(ref(db), {
    state: {
      ...clearedState(state.autoPick === true),
      pickPhase: "spinning",
      spinStartedAt: now,
      spinEndsAt: now + RANDOM_SPIN_MS,
      spinTargetPlayerId: winner.id,
      spinSequence: sequence
    } satisfies AuctionState
  });

  return winner;
}

/** After the reel animation — put the selected player on auction. */
export async function finalizeRandomPick(): Promise<Player | null> {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const state = stateSnap.val() as AuctionState | null;
  if (state?.pickPhase !== "spinning" || !state.spinTargetPlayerId) return null;

  const id = state.spinTargetPlayerId;
  await startPlayer(id);
  const psnap = await get(ref(db, `players/${id}`));
  const player = psnap.val() as Player | null;
  return player ? { ...player, id } : null;
}

export async function cancelRandomPick() {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const state = (stateSnap.val() as AuctionState | null) ?? clearedState(false);
  if (state.pickPhase !== "spinning") return;
  await update(ref(db), { state: clearedState(state.autoPick === true) });
}

/** Start the next AVAILABLE player (lowest number). */
export async function startNextPlayer(): Promise<Player | null> {
  const { db } = getFirebase();
  const [playersSnap, stateSnap] = await Promise.all([
    get(ref(db, "players")),
    get(ref(db, "state"))
  ]);
  const state = (stateSnap.val() as AuctionState | null) ?? clearedState(false);
  if (state.currentPlayerId) {
    throw new Error("A player is already on auction. Mark SOLD/UNSOLD or pause first.");
  }
  if (state.pickPhase === "spinning") {
    throw new Error("Wait for the random pick to finish.");
  }

  const next = pickNextEligiblePlayer(playersRecordToList(playersSnap.val() as Record<string, Player> | null));
  if (!next) return null;

  await startPlayer(next.id);
  return next;
}

export async function setAutoPick(enabled: boolean) {
  const { db } = getFirebase();
  await update(ref(db), { "state/autoPick": enabled });
}

/** Enable auto-pick and immediately put the first queued player live. */
export async function beginAutoAuction(): Promise<Player | null> {
  const { db } = getFirebase();
  await update(ref(db), { "state/autoPick": true });
  return startNextPlayer();
}

// ─── Place a bid ───────────────────────────────────────────────────
// If `customAmount` is provided, that exact rupee value is used.
// Otherwise bumps the current bid by `tournamentIncrement` (or to the
// player's base price if no bids have been placed yet).
export async function placeBid(
  teamId: string,
  tournamentIncrement: number,
  customAmount?: number
) {
  const { db } = getFirebase();
  const [stateSnap, teamSnap, playersSnap] = await Promise.all([
    get(ref(db, "state")),
    get(ref(db, `teams/${teamId}`)),
    get(ref(db, "players"))
  ]);
  const state = stateSnap.val() as AuctionState | null;
  const team = teamSnap.val() as Team | null;
  if (!state?.currentPlayerId) throw new Error("No active player on auction. Click \u201CStart\u201D on a player first.");
  if (!team) throw new Error("Team not found");

  const player = (playersSnap.val() as Record<string, Player> | null)?.[
    state.currentPlayerId
  ];
  if (!player) throw new Error("Active player missing");

  const owned = Object.values(
    (playersSnap.val() as Record<string, Player> | null) ?? {}
  ).filter((p) => p.teamId === teamId && p.status === "SOLD");
  const spent = owned.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
  const balance = team.totalBudget - spent;
  const maxBid = Math.max(0, balance - team.reserveBalance);

  const nextAmount =
    typeof customAmount === "number" && Number.isFinite(customAmount) && customAmount > 0
      ? Math.round(customAmount)
      : state.currentBid > 0
        ? state.currentBid + tournamentIncrement
        : player.basePrice;

  if (nextAmount < player.basePrice) {
    throw new Error(
      `Bid (${nextAmount}) must be at least the base price (${player.basePrice}).`
    );
  }
  if (state.currentBid > 0 && nextAmount <= state.currentBid) {
    throw new Error(
      `Bid (${nextAmount}) must be greater than the current bid (${state.currentBid}).`
    );
  }
  if (nextAmount > maxBid) {
    throw new Error(
      `Bid (${nextAmount}) exceeds ${team.name}'s max bid capacity (${maxBid}).`
    );
  }

  const bidsRef = ref(db, `bids/${player.id}`);
  const bidKey = push(bidsRef).key;

  await update(ref(db), {
    [`bids/${player.id}/${bidKey}`]: {
      teamId,
      amount: nextAmount,
      at: Date.now()
    },
    "state/currentBid": nextAmount,
    "state/currentTeamId": teamId
  });
}

// ─── Award to current highest bidder ───────────────────────────────
export async function markSold() {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const state = stateSnap.val() as AuctionState | null;
  if (!state?.currentPlayerId) throw new Error("No active player");
  if (!state.currentTeamId) throw new Error("No bids to award");

  const autoPick = state.autoPick === true;

  await update(ref(db), {
    [`players/${state.currentPlayerId}/status`]: "SOLD",
    [`players/${state.currentPlayerId}/teamId`]: state.currentTeamId,
    [`players/${state.currentPlayerId}/soldPrice`]: state.currentBid,
    state: clearedState(autoPick)
  });

}

// ─── Mark current as UNSOLD ────────────────────────────────────────
export async function markUnsold() {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const state = stateSnap.val() as AuctionState | null;
  if (!state?.currentPlayerId) throw new Error("No active player");

  const autoPick = state.autoPick === true;

  await update(ref(db), {
    [`players/${state.currentPlayerId}/status`]: "UNSOLD",
    [`players/${state.currentPlayerId}/teamId`]: null,
    [`players/${state.currentPlayerId}/soldPrice`]: null,
    state: clearedState(autoPick)
  });

}

// ─── Reset live state (does not touch sold history unless fullReset) ─
export async function resetLive(fullReset = false) {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const prev = (stateSnap.val() as AuctionState | null) ?? clearedState(false);

  const updates: Record<string, unknown> = {
    state: clearedState(prev.autoPick === true)
  };

  const playersSnap = await get(ref(db, "players"));
  const players = (playersSnap.val() as Record<string, Player> | null) ?? {};
  for (const [id, p] of Object.entries(players)) {
    if (fullReset) {
      updates[`players/${id}/status`] = "AVAILABLE";
      updates[`players/${id}/teamId`] = null;
      updates[`players/${id}/soldPrice`] = null;
    } else if (p.status === "ON_AUCTION") {
      updates[`players/${id}/status`] = "AVAILABLE";
    }
  }
  if (fullReset) updates["bids"] = null;

  await update(ref(db), updates);
}

// ─── Claim admin: writes /admins/{uid} = true ──────────────────────
export async function claimAdmin(uid: string) {
  const { db } = getFirebase();
  await set(ref(db, `admins/${uid}`), true);
}
