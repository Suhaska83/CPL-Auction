export function TournamentHeader({
  name,
  tagline
}: {
  name: string;
  tagline: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gold-400/70 shadow-glow">
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-extrabold tracking-wider text-white">
          CPL
        </div>
      </div>
      <div className="relative">
        <div
          className="relative bg-navy-800 px-5 py-1.5 font-display text-lg font-bold uppercase tracking-wider text-white sm:text-xl"
          style={{ clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0% 100%)" }}
        >
          {name}
        </div>
        <div
          className="mt-1 bg-gradient-to-r from-gold-500 to-orange-500 px-4 py-0.5 text-xs font-semibold uppercase tracking-widest text-navy-950 sm:text-sm"
          style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0% 100%)" }}
        >
          {tagline}
        </div>
      </div>
    </div>
  );
}
