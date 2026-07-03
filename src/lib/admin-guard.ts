import { NextResponse } from "next/server";

// Constant-time string compare to avoid timing side-channels on the admin key.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function requireAdmin(req: Request) {
  const pw = process.env.ADMIN_PASSWORD ?? "admin123";

  // In production, refuse to run with the well-known default password.
  if (process.env.NODE_ENV === "production" && pw === "admin123") {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD env var must be set to a strong value in production."
      },
      { status: 500 }
    );
  }

  const auth = req.headers.get("x-admin-key") ?? "";
  if (!safeEqual(auth, pw)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
