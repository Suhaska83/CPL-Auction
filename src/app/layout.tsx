import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "CPLAuction — Celebria Premier League",
  description:
    "Live cricket player auction platform. Follow real-time bids, teams and players."
};

async function getTournament() {
  const t = await prisma.tournament.findUnique({ where: { id: "main" } });
  return (
    t ?? {
      name: "Celebria Premier League",
      tagline: "The Triangle Pavilion"
    }
  );
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const t = await getTournament();
  return (
    <html lang="en">
      <body className="stadium-bg">
        <TopNav tournamentName={t.name} tagline={t.tagline} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 text-center text-xs text-white/40 sm:px-6">
          Managed by CPLAuction™ · Live Auction Platform
        </footer>
      </body>
    </html>
  );
}
