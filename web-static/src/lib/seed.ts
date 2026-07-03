import { ref, set, get, update } from "firebase/database";
import { getFirebase } from "@/firebase";
import type { Player, Team, Tournament } from "@/types";

const CRORE = 10_000_000;
const LAKH = 100_000;

const TEAMS: Team[] = [
  {
    id: "fr",
    name: "Fortune Royals",
    owner: "Nirmal",
    shortCode: "FR",
    colorHex: "#c9a227",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-royals&backgroundColor=1e3a8a",
    totalBudget: 50 * CRORE,
    reserveBalance: 275 * LAKH,
    createdAt: 1
  },
  {
    id: "fc",
    name: "Fortune Challengers",
    owner: "Abhishek",
    shortCode: "FC",
    colorHex: "#eab308",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-challengers&backgroundColor=0a1746",
    totalBudget: 50 * CRORE,
    reserveBalance: 275 * LAKH,
    createdAt: 2
  },
  {
    id: "fdi",
    name: "Fortune D Indians",
    owner: "Sabya",
    shortCode: "FDI",
    colorHex: "#1d4ed8",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-d-indians&backgroundColor=0b1a5c",
    totalBudget: 50 * CRORE,
    reserveBalance: 275 * LAKH,
    createdAt: 3
  },
  {
    id: "fsr",
    name: "Fortune Sunrisers",
    owner: "Hari",
    shortCode: "FSR",
    colorHex: "#ea580c",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-sunrisers&backgroundColor=7c2d12",
    totalBudget: 50 * CRORE,
    reserveBalance: 275 * LAKH,
    createdAt: 4
  }
];

const SKILLS = ["Batsman", "Bowler", "All Rounder", "Wicket Keeper"];

const PLAYER_NAMES = [
  "Abhinab Mishra", "Praneeth", "Ankur", "Subhasish Behera", "Rishabh Anand",
  "Mani (jeeva)", "Sunny", "Karthik", "Rohit S.", "Deepak",
  "Vinay", "Manoj", "Arjun", "Sanjay", "Prakash",
  "Ravi", "Nikhil", "Aakash", "Suresh", "Ganesh",
  "Vikram", "Harish", "Naveen", "Yash", "Tarun",
  "Ashwin", "Bhaskar", "Chirag", "Devansh", "Eshan",
  "Farhan", "Gaurav", "Hemant", "Imran", "Jatin",
  "Kunal", "Lokesh", "Mohit", "Nitin", "Omkar",
  "Pankaj", "Rakesh", "Sameer", "Tushar", "Uday",
  "Varun", "Wasim", "Yogesh", "Zaheer", "Ajay",
  "Balaji", "Chetan"
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
      age: 22 + (i % 15),
      skill: SKILLS[i % SKILLS.length],
      photoUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&radius=50`,
      matches: 40 + ((i * 7) % 60),
      runs: 100 + ((i * 53) % 500),
      wickets: (i * 3) % 90,
      points: 50 + ((i * 11) % 200),
      basePrice: 20 * LAKH,
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

  const tournament: Tournament = {
    name: "Celebria Premier League",
    tagline: "The Triangle Pavilion",
    squadSize: 13,
    bidIncrement: 25 * LAKH
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
      isRunning: false
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
