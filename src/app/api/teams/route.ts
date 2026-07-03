import { NextResponse } from "next/server";
import { getTeamStats } from "@/lib/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = await getTeamStats();
  return NextResponse.json({ teams });
}
