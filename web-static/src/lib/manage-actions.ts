import { get, ref, remove, set, update } from "firebase/database";
import { getFirebase } from "@/firebase";
import type { Player, Team } from "@/types";

// ─── Slugify helper for stable IDs ────────────────────────────────
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ─── Teams ────────────────────────────────────────────────────────
export type TeamInput = Omit<Team, "id" | "createdAt"> & {
  id?: string;
  createdAt?: number;
};

export async function upsertTeam(input: TeamInput) {
  const { db } = getFirebase();
  const id = input.id?.trim() || slugify(input.name);
  if (!id) throw new Error("Team must have a name.");

  const existing = await get(ref(db, `teams/${id}`));
  const team: Team = {
    id,
    name: input.name.trim(),
    owner: input.owner.trim(),
    shortCode: input.shortCode.trim().toUpperCase(),
    logoUrl: input.logoUrl?.trim() || null,
    colorHex: input.colorHex.trim() || "#1e3a8a",
    totalBudget: Math.max(0, Math.round(input.totalBudget)),
    reserveBalance: Math.max(0, Math.round(input.reserveBalance)),
    createdAt: existing.exists()
      ? (existing.val() as Team).createdAt ?? Date.now()
      : input.createdAt ?? Date.now()
  };
  await set(ref(db, `teams/${id}`), team);
  return team;
}

export async function deleteTeam(teamId: string) {
  const { db } = getFirebase();
  // Unassign any players belonging to this team + refund their soldPrice/status
  const playersSnap = await get(ref(db, "players"));
  const players = (playersSnap.val() as Record<string, Player> | null) ?? {};
  const updates: Record<string, unknown> = { [`teams/${teamId}`]: null };
  for (const [pid, p] of Object.entries(players)) {
    if (p.teamId === teamId) {
      updates[`players/${pid}/teamId`] = null;
      updates[`players/${pid}/soldPrice`] = null;
      updates[`players/${pid}/status`] = "AVAILABLE";
    }
  }
  await update(ref(db), updates);
}

// ─── Players ──────────────────────────────────────────────────────
export type PlayerInput = Omit<Player, "id"> & { id?: string };

function playerIdFor(number: number, existingId?: string): string {
  return existingId?.trim() || `p${String(number).padStart(3, "0")}`;
}

export async function upsertPlayer(input: PlayerInput) {
  const { db } = getFirebase();
  const id = playerIdFor(input.number, input.id);
  if (!id || !input.name.trim()) throw new Error("Number and name are required.");

  const player: Player = {
    id,
    number: Math.max(1, Math.round(input.number)),
    name: input.name.trim(),
    age: input.age ? Math.max(1, Math.round(input.age)) : null,
    skill: input.skill.trim() || "Batsman",
    photoUrl: input.photoUrl?.trim() || null,
    matches: Math.max(0, Math.round(input.matches ?? 0)),
    runs: Math.max(0, Math.round(input.runs ?? 0)),
    wickets: Math.max(0, Math.round(input.wickets ?? 0)),
    points: Math.max(0, Math.round(input.points ?? 0)),
    basePrice: Math.max(0, Math.round(input.basePrice ?? 2_000_000)),
    status: input.status ?? "AVAILABLE",
    teamId: input.teamId ?? null,
    soldPrice: input.soldPrice ?? null
  };
  await set(ref(db, `players/${id}`), player);
  return player;
}

export async function deletePlayer(playerId: string) {
  const { db } = getFirebase();
  await remove(ref(db, `players/${playerId}`));
  await remove(ref(db, `bids/${playerId}`));
}

// ─── CSV bulk import for players ──────────────────────────────────
// Accepted header row (case-insensitive, order-flexible):
//   number, name, skill, age, basePrice, photoUrl, matches, runs, wickets, points
// Only `number` and `name` are required. Missing optional fields fall back to defaults.
export function parsePlayersCsv(text: string): PlayerInput[] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["number", "name"];
  for (const r of required) {
    if (!header.includes(r)) {
      throw new Error(`CSV header must include: ${required.join(", ")}`);
    }
  }
  const idxOf = (k: string) => header.indexOf(k);
  const out: PlayerInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(",").map((c) => c.trim());
    const number = Number(cells[idxOf("number")]);
    const name = cells[idxOf("name")];
    if (!name || Number.isNaN(number)) continue;
    out.push({
      number,
      name,
      skill: cells[idxOf("skill")] || "Batsman",
      age: idxOf("age") >= 0 && cells[idxOf("age")] ? Number(cells[idxOf("age")]) : null,
      basePrice: idxOf("baseprice") >= 0 && cells[idxOf("baseprice")]
        ? Number(cells[idxOf("baseprice")])
        : 2_000_000,
      photoUrl: idxOf("photourl") >= 0 ? cells[idxOf("photourl")] : null,
      matches: idxOf("matches") >= 0 && cells[idxOf("matches")] ? Number(cells[idxOf("matches")]) : 0,
      runs: idxOf("runs") >= 0 && cells[idxOf("runs")] ? Number(cells[idxOf("runs")]) : 0,
      wickets: idxOf("wickets") >= 0 && cells[idxOf("wickets")] ? Number(cells[idxOf("wickets")]) : 0,
      points: idxOf("points") >= 0 && cells[idxOf("points")] ? Number(cells[idxOf("points")]) : 0,
      status: "AVAILABLE",
      teamId: null,
      soldPrice: null
    });
  }
  return out;
}

export async function bulkUpsertPlayers(players: PlayerInput[]) {
  for (const p of players) await upsertPlayer(p);
}

// ─── Tournament settings (name, tagline, squadSize, bidIncrement) ─
export async function updateTournament(patch: {
  name?: string;
  tagline?: string;
  squadSize?: number;
  bidIncrement?: number;
}) {
  const { db } = getFirebase();
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") updates[`tournament/${k}`] = v;
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
}
