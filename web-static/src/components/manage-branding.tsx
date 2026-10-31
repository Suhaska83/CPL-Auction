import { useEffect, useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { WelcomeDefaultLogo } from "@/components/welcome-default-logo";
import { updateTournament } from "@/lib/manage-actions";
import type { Tournament } from "@/types";

export function ManageBranding({ tournament }: { tournament: Tournament }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    tournament.managedByLogoUrl ?? null
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setLogoUrl(tournament.managedByLogoUrl ?? null);
  }, [tournament.managedByLogoUrl]);

  async function save(next: string | null) {
    setLogoUrl(next);
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      await updateTournament({ managedByLogoUrl: next });
      setInfo(next ? "Welcome logo saved." : "Welcome logo removed — default icon restored.");
    } catch (e) {
      setErr((e as Error).message);
      setLogoUrl(tournament.managedByLogoUrl ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="card border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">{err}</div>
      )}
      {info && (
        <div className="card border-green-700/50 bg-green-900/30 p-3 text-sm text-green-300">
          {info}
        </div>
      )}

      <div className="card p-4">
        <div className="mb-4 font-display text-lg font-bold uppercase text-gold-400">
          Welcome page — Managed By logo
        </div>
        <p className="mb-4 text-sm text-white/60">
          This image appears on the <b>Welcome</b> and <b>Live Auction</b> pages under{" "}
          <b>Managed By</b>. Upload PNG/JPG/WebP or paste a public image URL. Recommended:
          square or landscape, at least 512×512 px for the auction header.
        </p>

        <div className="mb-6 flex flex-col items-center gap-3 rounded-md border border-panel-border bg-navy-900/50 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
            Preview
          </div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Managed by"
              className="mx-auto h-40 w-40 object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.35)] sm:h-48 sm:w-48"
            />
          ) : (
            <WelcomeDefaultLogo className="mx-auto h-40 w-40 drop-shadow-[0_0_30px_rgba(250,204,21,0.35)] sm:h-48 sm:w-48" />
          )}
        </div>

        <ImageUpload
          value={logoUrl}
          onChange={(url) => save(url)}
          folder="misc"
          label="Custom logo"
          aspect="square"
        />
        {busy && <p className="mt-2 text-xs text-white/50">Saving…</p>}
      </div>
    </div>
  );
}
