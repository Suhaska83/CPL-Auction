/** User-facing message for Firebase RTDB / Auth failures. */
export function formatFirebaseWriteError(e: unknown, context?: string): string {
  const err = e as { code?: string; message?: string };
  const code = err.code ?? "";
  const base = err.message ?? String(e);
  const denied =
    code === "PERMISSION_DENIED" || /permission.?denied/i.test(base);

  if (!denied) {
    return context ? `${context}: ${base}` : base;
  }

  const hint =
    "Sign in on Admin with Google and ensure your account is listed under /admins/{your-uid} in Firebase Realtime Database (or use Claim admin when no admins exist). " +
    "If you recently changed team fields (caption, photos), republish database.rules.json: Firebase Console → Realtime Database → Rules → paste from this repo → Publish.";

  return context ? `${context}: ${base}\n\n${hint}` : `${base}\n\n${hint}`;
}
