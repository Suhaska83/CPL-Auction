export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M32 4L58 14V32C58 46 46 56 32 60C18 56 6 46 6 32V14L32 4Z"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="30" r="6" fill="white" />
        <path d="M22 40l20-14M22 46l20-14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-xl font-bold text-white">
          CPL<span className="text-gold-400">Auction</span>
          <sup className="ml-0.5 text-[10px] text-white/70">TM</sup>
        </div>
      </div>
    </div>
  );
}
