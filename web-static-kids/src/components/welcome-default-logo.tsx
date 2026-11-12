/** Fallback shield/cricket mark when no custom Managed By logo is set. */
export function WelcomeDefaultLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M100 8L188 40V116C188 168 148 200 100 212C52 200 12 168 12 116V40L100 8Z"
        stroke="white"
        strokeWidth="6"
      />
      <circle cx="100" cy="110" r="22" stroke="white" strokeWidth="5" fill="none" />
      <line x1="72" y1="140" x2="128" y2="86" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <line x1="72" y1="126" x2="128" y2="72" stroke="white" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
