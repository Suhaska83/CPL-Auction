import { NextResponse } from "next/server";
import { getLiveSnapshot } from "@/lib/auction-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await getLiveSnapshot();
  return NextResponse.json(snap);
}
