import { useState } from "react";
import { formatCompact, LAKH } from "@/lib/format";
import {
  bulkUpsertTeams,
  deleteTeam,
  parseTeamsCsv,
  upsertTeam,
  type TeamInput
} from "@/lib/manage-actions";
import { ImageUpload } from "@/components/image-upload";
import type { Team } from "@/types";

const CRORE = 10_000_000;

function empty(): TeamInput {
  return {
    name: "",
    owner: "",
    shortCode: "",
    colorHex: "#1e3a8a",
    logoUrl: null,
    totalBudget: 50 * CRORE,
    reserveBalance: 275 * LAKH
  };
}

export function ManageTeams({ teams }: { teams: Team[] }) {
  const [draft, setDraft] = useState<TeamInput | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await upsertTeam(draft);
      setDraft(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Team) {
    if (!confirm(`Delete team "${t.name}"? Players sold to this team will be released back to AVAILABLE.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteTeam(t.id);
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
      const rows = parseTeamsCsv(csvText);
      if (rows.length === 0) throw new Error("No valid rows found in CSV.");
      await bulkUpsertTeams(rows);
      setInfo(`Imported ${rows.length} team(s).`);
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
        <div className="text-sm text-white/60">{teams.length} team(s)</div>
        <div className="ml-auto flex gap-2">
          <button
            className="btn-ghost"
            onClick={() => setCsvOpen((v) => !v)}
            disabled={busy}
          >
            {csvOpen ? "Hide CSV import" : "Bulk import (CSV)"}
          </button>
          <button className="btn-primary" onClick={() => setDraft(empty())} disabled={busy}>
            + Add team
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
            First row is the header. <code>name</code> and <code>owner</code> are required;{" "}
            <code>shortCode, colorHex, totalBudget, reserveBalance, logoUrl</code> are optional.
            Rows with an existing team name will be updated.
          </p>
          <pre className="rounded bg-black/40 p-2 text-[11px] text-white/70">
{`name,owner,shortCode,colorHex,totalBudget,reserveBalance
Fortune Royals,Nirmal,FR,#c9a227,500000000,27500000
Fortune Challengers,Abhishek,FC,#eab308,500000000,27500000`}
          </pre>
          <textarea
            className="input h-32 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="paste rows here…"
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setCsvOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={importCsv}
              disabled={busy || !csvText.trim()}
            >
              {busy ? "Importing…" : "Import rows"}
            </button>
          </div>
        </div>
      )}

      {draft && (
        <TeamForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
          busy={busy}
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {teams.map((t) => (
          <div key={t.id} className="card flex items-center gap-3 p-3">
            <div
              className="grid h-14 w-14 place-items-center overflow-hidden rounded-md ring-1 ring-panel-border"
              style={{ backgroundColor: t.colorHex + "22" }}
            >
              {t.logoUrl ? (
                <img src={t.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white/70">{t.shortCode}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-white">
                {t.name} <span className="text-white/50">({t.owner})</span>
              </div>
              <div className="text-xs text-white/50">
                {t.shortCode} · Budget {formatCompact(t.totalBudget)} · Reserve{" "}
                {formatCompact(t.reserveBalance)}
              </div>
            </div>
            <button className="btn-ghost text-xs" onClick={() => setDraft({ ...t })} disabled={busy}>
              Edit
            </button>
            <button className="btn-danger text-xs" onClick={() => remove(t)} disabled={busy}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy
}: {
  draft: TeamInput;
  setDraft: (t: TeamInput) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof TeamInput>(k: K, v: TeamInput[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Team name">
          <input
            className="input"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Owner">
          <input
            className="input"
            required
            value={draft.owner}
            onChange={(e) => set("owner", e.target.value)}
          />
        </Field>
        <Field label="Short code (2–4 letters)">
          <input
            className="input uppercase"
            required
            maxLength={4}
            value={draft.shortCode}
            onChange={(e) => set("shortCode", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Colour">
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 cursor-pointer rounded-md border border-panel-border bg-panel"
              value={draft.colorHex}
              onChange={(e) => set("colorHex", e.target.value)}
            />
            <input
              className="input flex-1"
              value={draft.colorHex}
              onChange={(e) => set("colorHex", e.target.value)}
            />
          </div>
        </Field>
        <div className="md:col-span-2">
          <ImageUpload
            value={draft.logoUrl}
            onChange={(v) => set("logoUrl", v)}
            folder="logos"
            label="Team logo"
            aspect="square"
          />
        </div>
        <Field label="Total budget (₹)">
          <input
            type="number"
            className="input"
            min={0}
            step={LAKH}
            value={draft.totalBudget}
            onChange={(e) => set("totalBudget", Number(e.target.value))}
          />
          <Hint>{formatCompact(draft.totalBudget)}</Hint>
        </Field>
        <Field label="Reserve balance (₹)">
          <input
            type="number"
            className="input"
            min={0}
            step={LAKH}
            value={draft.reserveBalance}
            onChange={(e) => set("reserveBalance", Number(e.target.value))}
          />
          <Hint>{formatCompact(draft.reserveBalance)} held back for minimum bids</Hint>
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save team"}
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
