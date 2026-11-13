import { ref, set, get, update } from "firebase/database";
import { getFirebase } from "@/firebase";
import { CPL_SQUAD_SIZE, CPL_TEAM_BUDGET } from "@/lib/constants";
import { formatFirebaseWriteError } from "@/lib/firebase-errors";
import { safeTrim } from "@/lib/safe-string";
import type { Player, Team, Tournament } from "@/types";

export const DEFAULT_TOURNAMENT_NAME = "Celebria Premier League";

/** Creates `/tournament` in RTDB when missing (required for branding & settings). */
export async function ensureTournamentDefaults(): Promise<{ created: boolean }> {
  const { db } = getFirebase();
  const tRef = ref(db, "tournament");
  const snap = await get(tRef);
  const existing = snap.val() as Partial<Tournament> | null;
  if (snap.exists() && safeTrim(existing?.name)) {
    return { created: false };
  }

  const tournament: Tournament = {
    name: safeTrim(existing?.name) || DEFAULT_TOURNAMENT_NAME,
    tagline: safeTrim(existing?.tagline) ?? "",
    squadSize:
      Number(existing?.squadSize) > 0 ? Number(existing!.squadSize) : CPL_SQUAD_SIZE,
    bidIncrement:
      Number(existing?.bidIncrement) > 0 ? Number(existing!.bidIncrement) : 500,
    managedByLogoUrl: existing?.managedByLogoUrl ?? null
  };

  try {
    await set(tRef, tournament);
  } catch (e) {
    throw new Error(formatFirebaseWriteError(e, "Could not create /tournament"));
  }
  return { created: true };
}

const TEAMS: Team[] = [
  {
    id: "fr",
    name: "Fortune Royals",
    caption: "Nirmal",
    shortCode: "FR",
    colorHex: "#c9a227",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-royals&backgroundColor=1e3a8a",
    totalBudget: CPL_TEAM_BUDGET,
    reserveBalance: 0,
    createdAt: 1
  },
  {
    id: "fc",
    name: "Fortune Challengers",
    caption: "Abhishek",
    shortCode: "FC",
    colorHex: "#eab308",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-challengers&backgroundColor=0a1746",
    totalBudget: CPL_TEAM_BUDGET,
    reserveBalance: 0,
    createdAt: 2
  },
  {
    id: "fdi",
    name: "Fortune D Indians",
    caption: "Sabya",
    shortCode: "FDI",
    colorHex: "#1d4ed8",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-d-indians&backgroundColor=0b1a5c",
    totalBudget: CPL_TEAM_BUDGET,
    reserveBalance: 0,
    createdAt: 3
  },
  {
    id: "fsr",
    name: "Fortune Sunrisers",
    caption: "Hari",
    shortCode: "FSR",
    colorHex: "#ea580c",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-sunrisers&backgroundColor=7c2d12",
    totalBudget: CPL_TEAM_BUDGET,
    reserveBalance: 0,
    createdAt: 4
  }
];

/** Celebria roster (from tournament registration list). */
const PLAYER_NAMES = [
  "Aditya Agarwal",
  "Amar",
  "Amit K",
  "Anagh",
  "Aniruddha",
  "Ashish M",
  "Dhirendra",
  "Dinesh",
  "Jonty",
  "Kishore",
  "Krushna",
  "Kuldip",
  "Luvin",
  "Mayur",
  "Pankaj",
  "Rajan Marathe",
  "Raman",
  "Sanket",
  "Saravanan",
  "Satish",
  "Saurabh M",
  "Shripad",
  "Suhas Kale",
  "Tanmay",
  "Kish",
  "Sagar",
  "Saurabh",
  "Siva"
];

function slugId(number: number): string {
  return `p${String(number).padStart(3, "0")}`;
}

function buildPlayers(): Record<string, Player> {
  const out: Record<string, Player> = {};
  PLAYER_NAMES.forEach((name, i) => {
    const id = slugId(i + 1);
    out[id] = {
      id,
      number: i + 1,
      name,
      playerType: "Player",
      skill: "All Rounder",
      photoUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&radius=50`,
      matches: 40 + ((i * 7) % 60),
      runs: 100 + ((i * 53) % 500),
      wickets: (i * 3) % 90,
      points: 50 + ((i * 11) % 200),
      basePrice: 2_000,
      status: "AVAILABLE",
      teamId: null,
      soldPrice: null
    };
  });
  return out;
}

export async function seedIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  const { db } = getFirebase();
  const [t, teams, players] = await Promise.all([
    get(ref(db, "tournament")),
    get(ref(db, "teams")),
    get(ref(db, "players"))
  ]);
  if (t.exists() && teams.exists() && players.exists()) {
    return { seeded: false, message: "Database already contains data. Skipped." };
  }

  if (!t.exists() || !safeTrim((t.val() as Tournament | null)?.name)) {
    await ensureTournamentDefaults();
    if (teams.exists() && players.exists()) {
      return {
        seeded: true,
        message: "Created /tournament (teams and players were already present)."
      };
    }
  }

  const tournament: Tournament = {
    name: DEFAULT_TOURNAMENT_NAME,
    tagline: "",
    squadSize: CPL_SQUAD_SIZE,
    bidIncrement: 500,
    managedByLogoUrl: null
  };

  const teamMap: Record<string, Team> = {};
  for (const team of TEAMS) teamMap[team.id] = team;

  await update(ref(db), {
    tournament,
    teams: teamMap,
    players: buildPlayers(),
    state: {
      currentPlayerId: null,
      currentBid: 0,
      currentTeamId: null,
      isRunning: false,
      autoPick: false,
      pickPhase: "idle",
      spinStartedAt: null,
      spinEndsAt: null,
      spinTargetPlayerId: null,
      spinSequence: null,
      lastSoldPlayerId: null,
      lastSoldTeamId: null,
      lastSoldPrice: null
    },
    bids: null
  });

  return {
    seeded: true,
    message: `Seeded ${TEAMS.length} teams and ${PLAYER_NAMES.length} players.`
  };
}

export async function forceReseed() {
  const { db } = getFirebase();
  await set(ref(db, "tournament"), null);
  await set(ref(db, "teams"), null);
  await set(ref(db, "players"), null);
  await set(ref(db, "bids"), null);
  return await seedIfEmpty();
}
