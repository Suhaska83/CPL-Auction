import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────
const CRORE = 10_000_000;
const LAKH = 100_000;

const teamsSeed = [
  {
    name: "Fortune Royals",
    owner: "Nirmal",
    shortCode: "FR",
    colorHex: "#c9a227",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-royals&backgroundColor=1e3a8a"
  },
  {
    name: "Fortune Challengers",
    owner: "Abhishek",
    shortCode: "FC",
    colorHex: "#eab308",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-challengers&backgroundColor=0a1746"
  },
  {
    name: "Fortune D Indians",
    owner: "Sabya",
    shortCode: "FDI",
    colorHex: "#1d4ed8",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-d-indians&backgroundColor=0b1a5c"
  },
  {
    name: "Fortune Sunrisers",
    owner: "Hari",
    shortCode: "FSR",
    colorHex: "#ea580c",
    logoUrl:
      "https://api.dicebear.com/9.x/shapes/svg?seed=fortune-sunrisers&backgroundColor=7c2d12"
  }
];

const SKILLS = ["Batsman", "Bowler", "All Rounder", "Wicket Keeper"] as const;

const playersSeed = [
  "Abhinab Mishra",
  "Praneeth",
  "Ankur",
  "Subhasish Behera",
  "Rishabh Anand",
  "Mani (jeeva)",
  "Sunny",
  "Karthik",
  "Rohit S.",
  "Deepak",
  "Vinay",
  "Manoj",
  "Arjun",
  "Sanjay",
  "Prakash",
  "Ravi",
  "Nikhil",
  "Aakash",
  "Suresh",
  "Ganesh",
  "Vikram",
  "Harish",
  "Naveen",
  "Yash",
  "Tarun",
  "Ashwin",
  "Bhaskar",
  "Chirag",
  "Devansh",
  "Eshan",
  "Farhan",
  "Gaurav",
  "Hemant",
  "Imran",
  "Jatin",
  "Kunal",
  "Lokesh",
  "Mohit",
  "Nitin",
  "Omkar",
  "Pankaj",
  "Rakesh",
  "Sameer",
  "Tushar",
  "Uday",
  "Varun",
  "Wasim",
  "Yogesh",
  "Zaheer",
  "Ajay",
  "Balaji",
  "Chetan"
];

async function main() {
  console.log("🌱 Seeding database…");

  await prisma.bid.deleteMany();
  await prisma.auctionState.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.tournament.create({
    data: {
      id: "main",
      name: "Celebria Premier League",
      tagline: "The Triangle Pavilion",
      squadSize: 13,
      bidIncrement: 25 * LAKH
    }
  });

  const createdTeams = [];
  for (const t of teamsSeed) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        owner: t.owner,
        shortCode: t.shortCode,
        colorHex: t.colorHex,
        logoUrl: t.logoUrl,
        totalBudget: 50 * CRORE,
        reserveBalance: 275 * LAKH // 2.75 Cr held back
      }
    });
    createdTeams.push(team);
  }

  for (let i = 0; i < playersSeed.length; i++) {
    const name = playersSeed[i];
    const skill = SKILLS[i % SKILLS.length];
    await prisma.player.create({
      data: {
        number: i + 1,
        name,
        skill,
        age: 22 + (i % 15),
        photoUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
          name
        )}&radius=50`,
        matches: 40 + ((i * 7) % 60),
        runs: 100 + ((i * 53) % 500),
        wickets: (i * 3) % 90,
        points: 50 + ((i * 11) % 200),
        basePrice: 20 * LAKH
      }
    });
  }

  await prisma.auctionState.create({
    data: { id: "live", isRunning: false, currentBid: 0 }
  });

  console.log(
    `✅ Seeded ${createdTeams.length} teams and ${playersSeed.length} players.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
