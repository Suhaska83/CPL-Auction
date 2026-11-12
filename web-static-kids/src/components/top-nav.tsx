import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { BrandLogo } from "./brand-logo";
import { TournamentHeader } from "./tournament-header";

const links = [
  { to: "/", label: "Welcome", end: true },
  { to: "/auction", label: "Auction" },
  { to: "/teams", label: "Teams" },
  { to: "/players", label: "Players" },
  { to: "/admin", label: "Admin" }
];

export function TopNav({
  tournamentName,
  tagline
}: {
  tournamentName: string;
  tagline: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-navy-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <BrandLogo size={40} />
          <TournamentHeader name={tournamentName} tagline={tagline} />
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold uppercase tracking-wider">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                clsx(
                  "rounded-md px-3 py-2 transition-colors",
                  isActive ? "text-gold-400" : "text-white/70 hover:text-white"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <span className="ml-3 hidden rounded-md border border-brand-red/60 bg-brand-red/10 px-3 py-1 text-xs font-bold uppercase text-brand-red sm:inline">
            Live Mode
          </span>
        </nav>
      </div>
    </header>
  );
}
