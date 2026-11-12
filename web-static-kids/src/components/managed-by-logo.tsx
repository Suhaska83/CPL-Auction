import { WelcomeDefaultLogo } from "@/components/welcome-default-logo";
import { useTournament } from "@/hooks/useLiveData";

export function ManagedByLogo({ className }: { className?: string }) {
  const { value: tournament } = useTournament();
  const logoUrl = tournament.managedByLogoUrl?.trim();

  if (logoUrl) {
    return <img src={logoUrl} alt="Managed by" className={className} />;
  }
  return <WelcomeDefaultLogo className={className} />;
}
