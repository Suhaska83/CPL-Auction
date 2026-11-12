import { useRef, useState } from "react";
import { downloadJson, exportBackup, importBackup } from "@/lib/backup";

export function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const dump = await exportBackup();
      const stamp = new Date(dump.exportedAt)
        .toISOString()
        .replace(/[:T]/g, "-")
        .slice(0, 19);
      downloadJson(`cpl-auction-backup-${stamp}.json`, dump);
      setInfo("Backup downloaded.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(file: File) {
    if (!confirm(
      `Restoring "${file.name}" will OVERWRITE the current tournament, teams, players, state and bids. Continue?`
    )) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const { restored } = await importBackup(file);
      setInfo(`Restored nodes: ${restored.join(", ")}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="card border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
          {err}
        </div>
      )}
      {info && (
        <div className="card border-green-700/50 bg-green-900/30 p-3 text-sm text-green-300">
          {info}
        </div>
      )}

      <div className="card space-y-3 p-5">
        <div className="font-display text-lg font-bold uppercase text-gold-400">
          Export
        </div>
        <p className="text-sm text-white/70">
          Download a JSON snapshot of the current tournament, teams, players, live state and bid
          history. Use this to save a checkpoint before starting the auction, or to move data
          between Firebase projects. Admin list is <em>not</em> included so restoring a backup
          never locks anyone out.
        </p>
        <button className="btn-primary" onClick={handleExport} disabled={busy}>
          Download backup JSON
        </button>
      </div>

      <div className="card space-y-3 p-5">
        <div className="font-display text-lg font-bold uppercase text-gold-400">
          Restore
        </div>
        <p className="text-sm text-white/70">
          Select a previously downloaded backup file. This <b>overwrites</b> all current data.
          Anyone watching the site will see the new state instantly.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
          <button
            className="btn-danger"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Working…" : "Choose backup file & restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
