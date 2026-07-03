import { ref, get, set, update, push } from "firebase/database";
import { getFirebase } from "@/firebase";
import type { Player, Team, AuctionState } from "@/types";

// ─── Start bidding on a player ─────────────────────────────────────
export async function startPlayer(playerId: string) {
  const { db } = getFirebase();
  const psnap = await get(ref(db, `players/${playerId}`));
  const player = psnap.val() as Player | null;
  if (!player) throw new Error("Player not found");
  if (player.status === "SOLD") throw new Error("Player already sold");

  await update(ref(db), {
    [`players/${playerId}/status`]: "ON_AUCTION",
    state: {
      currentPlayerId: playerId,
      currentBid: player.basePrice,
      currentTeamId: null,
      isRunning: true
    } satisfies AuctionState
  });
}

// ─── Place a bid ───────────────────────────────────────────────────
export async function placeBid(teamId: string, tournamentIncrement: number) {
  const { db } = getFirebase();
  const [stateSnap, teamSnap, playersSnap] = await Promise.all([
    get(ref(db, "state")),
    get(ref(db, `teams/${teamId}`)),
    get(ref(db, "players"))
  ]);
  const state = stateSnap.val() as AuctionState | null;
  const team = teamSnap.val() as Team | null;
  if (!state?.currentPlayerId) throw new Error("No active player");
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
    state.currentBid > 0
      ? state.currentBid + tournamentIncrement
      : player.basePrice;

  if (nextAmount > maxBid) {
    throw new Error(`Bid exceeds team's max bid capacity (${maxBid})`);
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

  await update(ref(db), {
    [`players/${state.currentPlayerId}/status`]: "SOLD",
    [`players/${state.currentPlayerId}/teamId`]: state.currentTeamId,
    [`players/${state.currentPlayerId}/soldPrice`]: state.currentBid,
    state: {
      currentPlayerId: null,
      currentBid: 0,
      currentTeamId: null,
      isRunning: false
    } satisfies AuctionState
  });
}

// ─── Mark current as UNSOLD ────────────────────────────────────────
export async function markUnsold() {
  const { db } = getFirebase();
  const stateSnap = await get(ref(db, "state"));
  const state = stateSnap.val() as AuctionState | null;
  if (!state?.currentPlayerId) throw new Error("No active player");

  await update(ref(db), {
    [`players/${state.currentPlayerId}/status`]: "UNSOLD",
    [`players/${state.currentPlayerId}/teamId`]: null,
    [`players/${state.currentPlayerId}/soldPrice`]: null,
    state: {
      currentPlayerId: null,
      currentBid: 0,
      currentTeamId: null,
      isRunning: false
    } satisfies AuctionState
  });
}

// ─── Reset live state (does not touch sold history unless fullReset) ─
export async function resetLive(fullReset = false) {
  const { db } = getFirebase();
  const updates: Record<string, unknown> = {
    state: {
      currentPlayerId: null,
      currentBid: 0,
      currentTeamId: null,
      isRunning: false
    } satisfies AuctionState
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
