import { get, ref, remove, set, update } from "firebase/database";
import { getFirebase } from "@/firebase";
import { CPL_SQUAD_SIZE, CPL_TEAM_BUDGET } from "@/lib/constants";
import { formatFirebaseWriteError } from "@/lib/firebase-errors";
import { type TeamLike } from "@/lib/team-utils";
import type { Player, Team } from "@/types";

/** RTDB payload: caption + legacy owner alias so older published rules still accept writes. */
function teamRtdbPayload(team: Team, caption: string): Record<string, unknown> {
  return {
    ...team,
    caption,
    owner: caption
  };
}

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
  const caption = (input.caption ?? (input as TeamLike).owner ?? "").trim();
  if (!caption) throw new Error("Team must have a caption.");
  const team: Team = {
    id,
    name: input.name.trim(),
    caption,
    captionPhotoUrl: input.captionPhotoUrl?.trim() || null,
    shortCode: input.shortCode.trim().toUpperCase(),
    logoUrl: input.logoUrl?.trim() || null,
    colorHex: input.colorHex.trim() || "#1e3a8a",
    totalBudget: Math.max(0, Math.round(input.totalBudget)),
    reserveBalance: Math.max(0, Math.round(input.reserveBalance)),
    captainName: null,
    captainPhone: null,
    createdAt: existing.exists()
      ? (existing.val() as Team).createdAt ?? Date.now()
      : input.createdAt ?? Date.now()
  };
  try {
    await set(ref(db, `teams/${id}`), teamRtdbPayload(team, caption));
  } catch (e) {
    throw new Error(formatFirebaseWriteError(e, "Could not save team"));
  }
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
    phone: input.phone?.trim() || null,
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
      phone: idxOf("phone") >= 0 ? cells[idxOf("phone")] || null : null,
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

// ─── CSV bulk import for teams ─────────────────────────────────────
// Accepted header row (case-insensitive, order-flexible):
//   name, caption, shortCode, colorHex, totalBudget, reserveBalance, logoUrl
// Only `name` and `caption` are required (`owner` accepted as alias).
export function parseTeamsCsv(text: string): TeamInput[] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  if (!header.includes("name") || (!header.includes("caption") && !header.includes("owner"))) {
    throw new Error("CSV header must include: name, caption (or owner)");
  }
  const idxOf = (k: string) => header.indexOf(k);
  const captionIdx =
    idxOf("caption") >= 0 ? idxOf("caption") : idxOf("owner");
  const out: TeamInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(",").map((c) => c.trim());
    const name = cells[idxOf("name")];
    const caption = cells[captionIdx];
    if (!name || !caption) continue;
    out.push({
      name,
      caption,
      shortCode:
        (idxOf("shortcode") >= 0 && cells[idxOf("shortcode")]) ||
        name.slice(0, 3).toUpperCase(),
      colorHex:
        (idxOf("colorhex") >= 0 && cells[idxOf("colorhex")]) || "#1e3a8a",
      logoUrl:
        (idxOf("logourl") >= 0 && cells[idxOf("logourl")]) || null,
      totalBudget:
        idxOf("totalbudget") >= 0 && cells[idxOf("totalbudget")]
          ? Number(cells[idxOf("totalbudget")])
          : CPL_TEAM_BUDGET,
      reserveBalance:
        idxOf("reservebalance") >= 0 && cells[idxOf("reservebalance")]
          ? Number(cells[idxOf("reservebalance")])
          : 0
    });
  }
  return out;
}

export async function bulkUpsertTeams(teams: TeamInput[]) {
  for (const t of teams) await upsertTeam(t);
}

// ─── Reorder: swap two players' numbers ────────────────────────────
export async function swapPlayerNumbers(a: Player, b: Player) {
  const { db } = getFirebase();
  await update(ref(db), {
    [`players/${a.id}/number`]: b.number,
    [`players/${b.id}/number`]: a.number
  });
}

// ─── Tournament settings (name, tagline, squadSize, bidIncrement) ─
export async function updateTournament(patch: {
  name?: string;
  tagline?: string;
  squadSize?: number;
  bidIncrement?: number;
  managedByLogoUrl?: string | null;
}) {
  const { db } = getFirebase();
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) updates[`tournament/${k}`] = v;
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
}

/** Set every team's total budget to CPL_TEAM_BUDGET and clear reserve holdback. */
export async function applyAllTeamsBudget() {
  const { db } = getFirebase();
  const snap = await get(ref(db, "teams"));
  if (!snap.exists()) return;
  const updates: Record<string, unknown> = {};
  for (const id of Object.keys(snap.val() as Record<string, unknown>)) {
    updates[`teams/${id}/totalBudget`] = CPL_TEAM_BUDGET;
    updates[`teams/${id}/reserveBalance`] = 0;
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
}

/** Push live tournament squad size (does not change existing squads). */
export async function applyCplSquadSize() {
  await updateTournament({ squadSize: CPL_SQUAD_SIZE });
}

/** Team budgets + squad size for this CPL format. */
export async function applyCplLiveSettings() {
  await applyAllTeamsBudget();
  await applyCplSquadSize();
}
