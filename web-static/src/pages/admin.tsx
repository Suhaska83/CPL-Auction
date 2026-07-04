import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { AdminPanel } from "@/components/admin-panel";
import { ManagePlayers } from "@/components/manage-players";
import { ManageTeams } from "@/components/manage-teams";
import { signInWithGoogle, signOut } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  playerCounts,
  teamStats,
  useAuctionState,
  usePlayers,
  useTeams,
  useTournament
} from "@/hooks/useLiveData";
import { claimAdmin } from "@/lib/auction-actions";

type Tab = "auction" | "teams" | "players";

const TABS: { id: Tab; label: string }[] = [
  { id: "auction", label: "Live Auction" },
  { id: "teams", label: "Manage Teams" },
  { id: "players", label: "Manage Players" }
];

export function AdminPage() {
  const { user, loading, isAdmin, adminNodeExists } = useAuth();
  const { value: tournament } = useTournament();
  const { players } = usePlayers();
  const { teams } = useTeams();
  const { state } = useAuctionState();
  const [tab, setTab] = useState<Tab>("auction");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stats = useMemo(
    () => teamStats(teams, players, tournament.squadSize),
    [teams, players, tournament.squadSize]
  );
  const counts = useMemo(() => playerCounts(players), [players]);
  const currentPlayer = state.currentPlayerId
    ? players.find((p) => p.id === state.currentPlayerId) ?? null
    : null;

  async function handleClaim() {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      await claimAdmin(user.uid);
    } catch (e) {
      setErr(
        (e as Error).message +
          " — the security rules may already lock this down. See README for adding your UID via Firebase console."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="card p-6 text-white/60">Loading…</div>;

  if (!user) {
    return (
      <section className="space-y-4">
        <header>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wider">
            Admin Console
          </h1>
        </header>
        <div className="card space-y-3 p-6">
          <p className="text-white/70">
            Only signed-in administrators can control the auction. Sign in with Google
            to continue.
          </p>
          <button className="btn-primary" onClick={() => signInWithGoogle()}>
            Sign in with Google
          </button>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wider">
            Admin Console
          </h1>
          <button className="btn-ghost text-xs" onClick={() => signOut()}>
            Sign out ({user.displayName ?? user.email})
          </button>
        </header>
        <div className="card space-y-4 p-6">
          <div className="font-display text-lg font-bold uppercase text-red-300">
            Not authorised
          </div>
          <p className="text-white/70">
            You're signed in as <b>{user.email ?? user.displayName}</b>, but this
            account is not on the admin list.
          </p>
          <div className="rounded-md bg-navy-800/80 p-3 text-sm">
            <div className="text-white/50">Your Firebase UID:</div>
            <code className="mt-1 block break-all rounded bg-black/40 p-2 text-gold-300">
              {user.uid}
            </code>
          </div>

          {adminNodeExists === false && (
            <>
              <p className="text-white/70">
                No admins exist yet. Because you're the first, you can claim admin now:
              </p>
              <button className="btn-primary" onClick={handleClaim} disabled={busy}>
                Claim admin for this account
              </button>
              {err && <div className="text-sm text-red-300">{err}</div>}
            </>
          )}

          {adminNodeExists === true && (
            <p className="text-white/70">
              Admin is already configured. Ask the existing admin (or open Firebase
              console → Realtime Database → <code>/admins</code>) to add your UID.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">
          Admin Console
        </h1>
        <button className="btn-ghost text-xs" onClick={() => signOut()}>
          Sign out ({user.email ?? user.displayName})
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-1 border-b border-panel-border/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "-mb-px rounded-t-md px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors",
              tab === t.id
                ? "border border-b-transparent border-panel-border bg-panel text-gold-400"
                : "text-white/60 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "auction" && (
        <AdminPanel
          tournament={tournament}
          teams={stats}
          players={players}
          state={state}
          counts={counts}
          currentPlayer={currentPlayer}
        />
      )}
      {tab === "teams" && <ManageTeams teams={teams} />}
      {tab === "players" && <ManagePlayers players={players} teams={teams} />}
    </section>
  );
}
