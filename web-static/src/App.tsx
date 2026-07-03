import { Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from "@/components/top-nav";
import { ConfigBanner } from "@/components/config-banner";
import { WelcomePage } from "@/pages/welcome";
import { AuctionPage } from "@/pages/auction";
import { TeamsPage } from "@/pages/teams";
import { PlayersPage } from "@/pages/players";
import { AdminPage } from "@/pages/admin";
import { useTournament } from "@/hooks/useLiveData";

export function App() {
  const { value: tournament } = useTournament();

  return (
    <div className="stadium-bg min-h-screen">
      <TopNav tournamentName={tournament.name} tagline={tournament.tagline} />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <ConfigBanner />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/auction" element={<AuctionPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 text-center text-xs text-white/40 sm:px-6">
        Managed by CPLAuction™ · Static · Firebase-powered
      </footer>
    </div>
  );
}
