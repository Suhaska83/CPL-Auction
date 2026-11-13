export type PlayerStatus = "AVAILABLE" | "ON_AUCTION" | "SOLD" | "UNSOLD";

/** Captain = franchise captain (not auctioned). Player = in the auction pool. */
export type PlayerType = "Captain" | "Player";

export interface Tournament {
  name: string;
  tagline: string;
  squadSize: number;
  bidIncrement: number;
  /** Welcome page logo under “Managed By” (optional). */
  managedByLogoUrl?: string | null;
}

export interface Team {
  id: string;
  name: string;
  captain: string;
  /** When set, only this roster player is excluded from the auction (not name guesses). */
  captainPlayerId?: string | null;
  /** Optional portrait for squad list; else matched from player roster by captain name. */
  captainPhotoUrl?: string | null;
  shortCode: string;
  logoUrl?: string | null;
  colorHex: string;
  totalBudget: number;
  reserveBalance: number;
  captainName?: string | null;
  captainPhone?: string | null;
  createdAt?: number;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  playerType: PlayerType;
  photoUrl?: string | null;
  skill: string;
  phone?: string | null;
  matches: number;
  runs: number;
  wickets: number;
  points: number;
  basePrice: number;
  status: PlayerStatus;
  teamId?: string | null;
  soldPrice?: number | null;
}

export interface AuctionState {
  currentPlayerId: string | null;
  currentBid: number;
  currentTeamId: string | null;
  isRunning: boolean;
  /** @deprecated Sequential auto-pick; prefer random pick controls in admin. */
  autoPick?: boolean;
  pickPhase?: "idle" | "spinning";
  spinStartedAt?: number | null;
  spinEndsAt?: number | null;
  spinTargetPlayerId?: string | null;
  spinSequence?: string[] | null;
  /** Position in spinSequence where the reel stops (random each pick). */
  spinLandIndex?: number | null;
  /** Full reel lap count before stopping (random each pick). */
  spinExtraLaps?: number | null;
  lastSoldPlayerId?: string | null;
  lastSoldTeamId?: string | null;
  lastSoldPrice?: number | null;
}

export interface TeamStats extends Team {
  spent: number;
  balance: number;
  squadCount: number;
  squadSize: number;
  maxBid: number;
  players: Player[];
}

export interface PlayerCounts {
  all: number;
  available: number;
  sold: number;
  unsold: number;
}
