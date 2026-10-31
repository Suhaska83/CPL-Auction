export type PlayerStatus = "AVAILABLE" | "ON_AUCTION" | "SOLD" | "UNSOLD";

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
  caption: string;
  /** Optional portrait for squad list; else matched from player roster by caption name. */
  captionPhotoUrl?: string | null;
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
  age?: number | null;
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
