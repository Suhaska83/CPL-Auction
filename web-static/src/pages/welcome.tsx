import { Link } from "react-router-dom";
import { WelcomeDefaultLogo } from "@/components/welcome-default-logo";
import { useTournament } from "@/hooks/useLiveData";

export function WelcomePage() {
  const { value: tournament } = useTournament();
  const logoUrl = tournament.managedByLogoUrl?.trim();

  return (
    <section className="field-lights relative flex min-h-[calc(100vh-140px)] flex-col items-center justify-center gap-10 text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
        Managed By
      </div>

      <div className="relative">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Managed by"
            className="mx-auto h-40 w-40 object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.35)] sm:h-48 sm:w-48"
          />
        ) : (
          <WelcomeDefaultLogo className="mx-auto h-40 w-40 drop-shadow-[0_0_30px_rgba(250,204,21,0.35)] sm:h-48 sm:w-48" />
        )}
        <div className="mt-6 font-display text-6xl font-bold tracking-tight sm:text-7xl">
          CPL<span className="text-gold-400">Auction</span>
          <sup className="ml-1 text-lg text-white/70">TM</sup>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          The live cricket auction experience. Follow live bids, team squads and player
          stats in real time.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/auction" className="btn-primary shadow-glow">
          Enter Live Auction
        </Link>
        <Link to="/teams" className="btn-ghost">
          View Teams
        </Link>
        <Link to="/players" className="btn-ghost">
          View Players
        </Link>
      </div>

      <div className="mt-6 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Teams" value="4" />
        <Stat label="Squad Size" value="8" />
        <Stat label="Budget" value="₹20K" />
        <Stat label="Format" value="Live Auction" />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-gold-400">{value}</div>
    </div>
  );
}
