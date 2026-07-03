import { useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebase, isFirebaseConfigured } from "@/firebase";
import type {
  AuctionState,
  Player,
  PlayerCounts,
  Team,
  TeamStats,
  Tournament
} from "@/types";

// ─── Generic live-value hook ───────────────────────────────────────
function useDbValue<T>(path: string, initial: T): { value: T; loading: boolean } {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const { db } = getFirebase();
    const r = ref(db, path);
    const unsub = onValue(r, (snap) => {
      setValue((snap.val() as T) ?? initial);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return { value, loading };
}

// ─── Firebase RTDB stores objects keyed by id; flatten to arrays ───
function toArray<T extends { id?: string }>(
  obj: Record<string, T> | null | undefined
): (T & { id: string })[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ ...(v as T), id }));
}

// ─── Public hooks ───────────────────────────────────────────────────
export function useTournament(): { value: Tournament; loading: boolean } {
  const fallback: Tournament = {
    name: "Celebria Premier League",
    tagline: "The Triangle Pavilion",
    squadSize: 13,
    bidIncrement: 2_500_000
  };
  const { value, loading } = useDbValue<Tournament | null>("tournament", null);
  return { value: value ?? fallback, loading };
}

export function useTeams(): { teams: Team[]; loading: boolean } {
  const { value, loading } = useDbValue<Record<string, Team> | null>("teams", null);
  const teams = useMemo(() => toArray<Team>(value ?? undefined), [value]);
  return { teams, loading };
}

export function usePlayers(): { players: Player[]; loading: boolean } {
  const { value, loading } = useDbValue<Record<string, Player> | null>(
    "players",
    null
  );
  const players = useMemo(
    () =>
      toArray<Player>(value ?? undefined).sort((a, b) => a.number - b.number),
    [value]
  );
  return { players, loading };
}

export function useAuctionState(): { state: AuctionState; loading: boolean } {
  const initial: AuctionState = {
    currentPlayerId: null,
    currentBid: 0,
    currentTeamId: null,
    isRunning: false
  };
  const { value, loading } = useDbValue<AuctionState | null>("state", null);
  return { state: value ?? initial, loading };
}

// ─── Derived: player counts + team stats ───────────────────────────
export function playerCounts(players: Player[]): PlayerCounts {
  const counts: PlayerCounts = { all: players.length, available: 0, sold: 0, unsold: 0 };
  for (const p of players) {
    if (p.status === "AVAILABLE" || p.status === "ON_AUCTION") counts.available += 1;
    else if (p.status === "SOLD") counts.sold += 1;
    else if (p.status === "UNSOLD") counts.unsold += 1;
  }
  return counts;
}

export function teamStats(
  teams: Team[],
  players: Player[],
  squadSize: number
): TeamStats[] {
  return teams
    .slice()
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .map((t) => {
      const owned = players.filter((p) => p.teamId === t.id && p.status === "SOLD");
      const spent = owned.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
      const balance = t.totalBudget - spent;
      const maxBid = Math.max(0, balance - t.reserveBalance);
      return {
        ...t,
        spent,
        balance,
        squadCount: owned.length,
        squadSize,
        maxBid,
        players: owned
      };
    });
}
