import { useMemo, useState } from "react";
import { formatCompact, LAKH } from "@/lib/format";
import {
  bulkUpsertPlayers,
  deletePlayer,
  parsePlayersCsv,
  swapPlayerNumbers,
  upsertPlayer,
  type PlayerInput
} from "@/lib/manage-actions";
import { ImageUpload } from "@/components/image-upload";
import type { Player, Team } from "@/types";

const SKILLS = ["Batsman", "Bowler", "All Rounder", "Wicket Keeper"];

function nextNumber(players: Player[]): number {
  const max = players.reduce((m, p) => Math.max(m, p.number), 0);
  return max + 1;
}

function empty(number: number): PlayerInput {
  return {
    number,
    name: "",
    age: null,
    skill: "Batsman",
    photoUrl: null,
    matches: 0,
    runs: 0,
    wickets: 0,
    points: 0,
    basePrice: 20 * LAKH,
    status: "AVAILABLE",
    teamId: null,
    soldPrice: null
  };
}

export function ManagePlayers({ players, teams }: { players: Player[]; teams: Team[] }) {
  const [draft, setDraft] = useState<PlayerInput | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        String(p.number).includes(s) ||
        p.skill.toLowerCase().includes(s)
    );
  }, [players, q]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await upsertPlayer(draft);
      setDraft(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Player) {
    if (!confirm(`Delete #${p.number} ${p.name}? This also removes their bid history.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await deletePlayer(p.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function move(p: Player, dir: -1 | 1) {
    // Find the previous/next player in current sort order (by number)
    const sorted = players.slice().sort((a, b) => a.number - b.number);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const neighbour = sorted[idx + dir];
    if (!neighbour) return;
    setBusy(true);
    setErr(null);
    try {
      await swapPlayerNumbers(p, neighbour);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const rows = parsePlayersCsv(csvText);
      if (rows.length === 0) throw new Error("No valid rows found in CSV.");
      await bulkUpsertPlayers(rows);
      setInfo(`Imported ${rows.length} player(s).`);
      setCsvText("");
      setCsvOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-64"
          placeholder="Search by name, number or skill"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <button
            className="btn-ghost"
            onClick={() => setCsvOpen((v) => !v)}
            disabled={busy}
          >
            {csvOpen ? "Hide CSV import" : "Bulk import (CSV)"}
          </button>
          <button
            className="btn-primary"
            onClick={() => setDraft(empty(nextNumber(players)))}
            disabled={busy}
          >
            + Add player
          </button>
        </div>
      </div>

      {err && (
        <div className="card border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">{err}</div>
      )}
      {info && (
        <div className="card border-green-700/50 bg-green-900/30 p-3 text-sm text-green-300">
          {info}
        </div>
      )}

      {csvOpen && (
        <div className="card space-y-2 p-4">
          <div className="font-display text-sm font-bold uppercase text-gold-400">
            Paste CSV (from Google Sheets / Excel)
          </div>
          <p className="text-xs text-white/60">
            First row must be a header. <code>number</code> and <code>name</code> are required;{" "}
            <code>skill, age, basePrice, photoUrl, matches, runs, wickets, points</code> are optional.
            Rows with an existing <code>number</code> will be updated; new numbers become new
            players.
          </p>
          <pre className="rounded bg-black/40 p-2 text-[11px] text-white/70">
{`number,name,skill,age,basePrice
1,Abhinab Mishra,Batsman,28,2000000
2,Praneeth,All Rounder,25,2000000
3,Ankur,Bowler,30,2500000`}
          </pre>
          <textarea
            className="input h-40 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="paste rows here…"
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setCsvOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-primary" onClick={importCsv} disabled={busy || !csvText.trim()}>
              {busy ? "Importing…" : "Import rows"}
            </button>
          </div>
        </div>
      )}

      {draft && (
        <PlayerForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
          busy={busy}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-800 text-left text-[10px] uppercase tracking-wider text-white/70">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Skill</th>
              <th className="px-3 py-2">Base</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border/60">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-panel-light/30">
                <td className="px-3 py-2 font-mono text-white/70">{p.number}</td>
                <td className="px-3 py-2 font-medium text-white">{p.name}</td>
                <td className="px-3 py-2 text-white/70">{p.skill}</td>
                <td className="px-3 py-2 text-white/70">{formatCompact(p.basePrice)}</td>
                <td className="px-3 py-2">
                  <span className="chip bg-navy-800 text-white/70">{p.status}</span>
                </td>
                <td className="px-3 py-2 text-white/70">
                  {p.teamId ? teamById[p.teamId]?.name ?? p.teamId : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      className="rounded bg-navy-800 px-2 py-1 text-xs text-white/80 hover:bg-navy-700 disabled:opacity-40"
                      onClick={() => move(p, -1)}
                      disabled={busy}
                      title="Move up (swap number with the previous player)"
                    >
                      ↑
                    </button>
                    <button
                      className="rounded bg-navy-800 px-2 py-1 text-xs text-white/80 hover:bg-navy-700 disabled:opacity-40"
                      onClick={() => move(p, 1)}
                      disabled={busy}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn-ghost ml-1 text-xs"
                      onClick={() => setDraft({ ...p })}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger text-xs"
                      onClick={() => remove(p)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-white/50">
                  No players.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy
}: {
  draft: PlayerInput;
  setDraft: (p: PlayerInput) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof PlayerInput>(k: K, v: PlayerInput[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Number">
          <input
            type="number"
            className="input"
            min={1}
            required
            value={draft.number}
            onChange={(e) => set("number", Number(e.target.value))}
          />
        </Field>
        <Field label="Name" span="col-span-2">
          <input
            className="input"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Skill">
          <select
            className="input"
            value={draft.skill}
            onChange={(e) => set("skill", e.target.value)}
          >
            {SKILLS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Age">
          <input
            type="number"
            className="input"
            min={1}
            value={draft.age ?? ""}
            onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Base price (₹)" span="col-span-2">
          <input
            type="number"
            className="input"
            min={0}
            step={LAKH}
            value={draft.basePrice}
            onChange={(e) => set("basePrice", Number(e.target.value))}
          />
          <Hint>{formatCompact(draft.basePrice)}</Hint>
        </Field>
        <div className="col-span-2 md:col-span-4">
          <ImageUpload
            value={draft.photoUrl}
            onChange={(v) => set("photoUrl", v)}
            folder="players"
            label="Player photo"
            aspect="square"
          />
        </div>
        <Field label="Matches">
          <input
            type="number"
            className="input"
            min={0}
            value={draft.matches}
            onChange={(e) => set("matches", Number(e.target.value))}
          />
        </Field>
        <Field label="Runs">
          <input
            type="number"
            className="input"
            min={0}
            value={draft.runs}
            onChange={(e) => set("runs", Number(e.target.value))}
          />
        </Field>
        <Field label="Wickets">
          <input
            type="number"
            className="input"
            min={0}
            value={draft.wickets}
            onChange={(e) => set("wickets", Number(e.target.value))}
          />
        </Field>
        <Field label="Points">
          <input
            type="number"
            className="input"
            min={0}
            value={draft.points}
            onChange={(e) => set("points", Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save player"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  span
}: {
  label: string;
  children: React.ReactNode;
  span?: string;
}) {
  return (
    <label className={`block ${span ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-[11px] text-white/50">{children}</span>;
}
