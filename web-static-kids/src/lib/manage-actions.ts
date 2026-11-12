import { get, ref, remove, set, update } from "firebase/database";
import { getFirebase } from "@/firebase";
import { nameMatchKey, normalizePlayer, normalizePlayerType } from "@/lib/player-utils";
import { CPL_SQUAD_SIZE, CPL_TEAM_BUDGET } from "@/lib/constants";
import { formatFirebaseWriteError } from "@/lib/firebase-errors";
import { safeTrim } from "@/lib/safe-string";
import { type TeamLike } from "@/lib/team-utils";
import type { Player, PlayerType, Team } from "@/types";

/** RTDB payload: caption + legacy owner alias so older published rules still accept writes. */
function teamRtdbPayload(team: Team, caption: string): Record<string, unknown> {
  return {
    ...team,
    caption,
    owner: caption,
    captionPlayerId: team.captionPlayerId ?? null
  };
}

function playersRecordToList(raw: Record<string, Player> | null): Player[] {
  if (!raw) return [];
  return Object.entries(raw).map(([id, p]) => normalizePlayer(id, p));
}

/** Link caption text to a roster row only when exactly one name matches. */
function resolveCaptionPlayerId(
  caption: string,
  players: Player[],
  explicit: string | null | undefined
): string | null {
  const capKey = nameMatchKey(caption);
  if (!capKey) return null;
  const manual = safeTrim(explicit);
  if (manual) {
    const row = players.find((p) => p.id === manual);
    if (row && nameMatchKey(row.name) === capKey) return manual;
    return null;
  }
  const matches = players.filter((p) => nameMatchKey(p.name) === capKey);
  return matches.length === 1 ? matches[0]!.id : null;
}

// ─── Slugify helper for stable IDs ────────────────────────────────
function slugify(input: unknown): string {
  return safeTrim(input)
    .toLowerCase()
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
  const id = safeTrim(input.id) || slugify(input.name);
  if (!id) throw new Error("Team must have a name.");

  const [existing, playersSnap] = await Promise.all([
    get(ref(db, `teams/${id}`)),
    get(ref(db, "players"))
  ]);
  const roster = playersRecordToList(playersSnap.val() as Record<string, Player> | null);
  const caption = safeTrim(input.caption ?? (input as TeamLike).owner);
  if (!caption) throw new Error("Team must have a caption.");
  const prev = existing.exists() ? (existing.val() as Team) : null;
  let captionPlayerId = resolveCaptionPlayerId(caption, roster, input.captionPlayerId);
  if (!captionPlayerId && prev?.captionPlayerId) {
    captionPlayerId = resolveCaptionPlayerId(caption, roster, prev.captionPlayerId);
  }
  const team: Team = {
    id,
    name: safeTrim(input.name),
    caption,
    captionPlayerId,
    captionPhotoUrl: safeTrim(input.captionPhotoUrl) || null,
    shortCode: safeTrim(input.shortCode).toUpperCase() || "TBD",
    logoUrl: safeTrim(input.logoUrl) || null,
    colorHex: safeTrim(input.colorHex) || "#1e3a8a",
    totalBudget: Math.max(0, Math.round(input.totalBudget)),
    reserveBalance: Math.max(0, Math.round(input.reserveBalance)),
    captainName: null,
    captainPhone: null,
    createdAt: prev?.createdAt ?? input.createdAt ?? Date.now()
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
  return safeTrim(existingId) || `p${String(number).padStart(3, "0")}`;
}

export async function upsertPlayer(input: PlayerInput) {
  const { db } = getFirebase();
  const id = playerIdFor(input.number, input.id);
  if (!id || !safeTrim(input.name)) throw new Error("Number and name are required.");

  const player: Player = {
    id,
    number: Math.max(1, Math.round(input.number)),
    name: safeTrim(input.name),
    playerType: normalizePlayerType(input.playerType),
    skill: safeTrim(input.skill) || "Batsman",
    photoUrl: safeTrim(input.photoUrl) || null,
    phone: safeTrim(input.phone) || null,
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
//   number, name, skill, playerType, basePrice, photoUrl, matches, runs, wickets, points
// playerType: Caption | Player (aliases: type, playertype). Legacy `age` column is ignored.
// Only `number` and `name` are required. Missing optional fields fall back to defaults.
function playerTypeFromCsv(header: string[], cells: string[]): PlayerType {
  const idxOf = (k: string) => header.indexOf(k);
  const i =
    idxOf("playertype") >= 0
      ? idxOf("playertype")
      : idxOf("type") >= 0
        ? idxOf("type")
        : -1;
  if (i >= 0 && cells[i]) return normalizePlayerType(cells[i]);
  return "Player";
}

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
      playerType: playerTypeFromCsv(header, cells),
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
  await syncCaptionPlayerIdsForTeams();
}

/** Writes captionPlayerId on each team when caption name matches exactly one roster player. */
export async function syncCaptionPlayerIdsForTeams() {
  const { db } = getFirebase();
  const [teamsSnap, playersSnap] = await Promise.all([
    get(ref(db, "teams")),
    get(ref(db, "players"))
  ]);
  if (!teamsSnap.exists()) return { updated: 0 };
  const roster = playersRecordToList(playersSnap.val() as Record<string, Player> | null);
  const updates: Record<string, unknown> = {};
  let updated = 0;
  for (const [teamId, raw] of Object.entries(teamsSnap.val() as Record<string, TeamLike>)) {
    const caption = safeTrim(raw.caption ?? raw.owner);
    if (!caption) continue;
    // Re-resolve from caption name so stale/wrong captionPlayerId values are cleared.
    const id = resolveCaptionPlayerId(caption, roster, undefined);
    const prev = safeTrim(raw.captionPlayerId) || null;
    const next = id || null;
    if (next !== prev) {
      updates[`teams/${teamId}/captionPlayerId`] = next;
      updated += 1;
    }
  }
  if (Object.keys(updates).length) await update(ref(db), updates);
  return { updated };
}

/** Clears all captionPlayerId fields (use before re-linking if bids were blocked incorrectly). */
export async function clearCaptionPlayerLinks() {
  const { db } = getFirebase();
  const teamsSnap = await get(ref(db, "teams"));
  if (!teamsSnap.exists()) return { cleared: 0 };
  const updates: Record<string, null> = {};
  let cleared = 0;
  for (const teamId of Object.keys(teamsSnap.val() as Record<string, unknown>)) {
    updates[`teams/${teamId}/captionPlayerId`] = null;
    cleared += 1;
  }
  await update(ref(db), updates);
  return { cleared };
}
