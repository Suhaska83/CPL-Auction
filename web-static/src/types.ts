export type PlayerStatus = "AVAILABLE" | "ON_AUCTION" | "SOLD" | "UNSOLD";

export interface Tournament {
  name: string;
  tagline: string;
  squadSize: number;
  bidIncrement: number;
}

export interface Team {
  id: string;
  name: string;
  owner: string;
  shortCode: string;
  logoUrl?: string | null;
  colorHex: string;
  totalBudget: number;
  reserveBalance: number;
  createdAt?: number;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  age?: number | null;
  photoUrl?: string | null;
  skill: string;
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
