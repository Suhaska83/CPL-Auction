import { isFirebaseConfigured } from "@/firebase";

export function ConfigBanner() {
  if (isFirebaseConfigured) return null;
  return (
    <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-red-700/60 bg-red-900/30 p-4 text-sm text-red-200">
      <div className="font-semibold text-red-100">Firebase is not configured.</div>
      <p className="mt-1 text-red-200/90">
        Copy <code className="rounded bg-black/30 px-1 py-0.5">.env.example</code> to{" "}
        <code className="rounded bg-black/30 px-1 py-0.5">.env.local</code> and paste
        the config from your Firebase console (Project settings → General → Your apps →
        SDK setup and configuration). Then restart the dev server.
      </p>
    </div>
  );
}
