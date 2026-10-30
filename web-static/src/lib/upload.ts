import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase, storageBucketConfigured } from "@/firebase";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB pick
const INLINE_MAX_BYTES = 350 * 1024; // RTDB-friendly inline data URLs
const ALLOWED = /^image\/(png|jpe?g|gif|webp|svg\+xml)$/;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

function inferContentType(file: File): string {
  if (file.type && ALLOWED.test(file.type)) return file.type;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "heic" || ext === "heif") {
    throw new Error(
      "HEIC/HEIF photos are not supported in the browser. Save as JPG/PNG, or paste an image URL."
    );
  }
  throw new Error("Only PNG / JPG / WebP / GIF / SVG allowed.");
}

// Basic client-side downscale so uploads stay small (Storage or inline data URL).
async function downscale(file: File, maxDim = 800): Promise<Blob> {
  const contentType = inferContentType(file);
  if (contentType === "image/svg+xml" || contentType === "image/gif") {
    if (file.size > INLINE_MAX_BYTES) {
      throw new Error("SVG/GIF too large — paste a hosted URL instead.");
    }
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await withTimeout(
      new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read this image file."));
        el.src = url;
      }),
      12_000,
      "Image processing timed out — try a smaller JPG/PNG or paste a URL."
    );

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 400 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available in this browser.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outType = contentType === "image/png" ? "image/png" : "image/jpeg";
    const blob = await withTimeout(
      new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("Could not compress image."))),
          outType,
          0.82
        )
      ),
      8_000,
      "Image compression timed out."
    );
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (blob.size > INLINE_MAX_BYTES) {
    throw new Error(
      `Image is still ${Math.round(blob.size / 1024)} KB after compression. ` +
        "Use a smaller photo or paste a public image URL."
    );
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not encode image."));
    reader.readAsDataURL(blob);
  });
}

async function uploadToFirebaseStorage(
  blob: Blob,
  contentType: string,
  folder: string,
  ext: string
): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { storage } = getFirebase();
  const r = storageRef(storage, path);
  try {
    await withTimeout(
      uploadBytes(r, blob, { contentType }),
      25_000,
      "Firebase Storage upload timed out. Check that Storage is enabled in Firebase console " +
        "and storage.rules are published — or paste an image URL instead."
    );
    return await getDownloadURL(r);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error).message ?? "";
    if (code === "storage/unauthorized" || code === "storage/unauthenticated") {
      throw new Error(
        "Upload denied: sign in on Admin with Google first, and publish storage.rules " +
          "(Firebase console → Storage → Rules)."
      );
    }
    if (
      code === "storage/unknown" ||
      code === "storage/object-not-found" ||
      /404|bucket|timed out/i.test(msg)
    ) {
      throw new Error(
        "Firebase Storage is not reachable (bucket missing or Storage not enabled). " +
          "Saving inline instead is attempted automatically."
      );
    }
    throw e;
  }
}

/**
 * Returns a URL suitable for `photoUrl` / `logoUrl` / `managedByLogoUrl`.
 * Uses Firebase Storage when configured and working; otherwise stores a compressed
 * data URL in Realtime Database (no Storage billing required).
 */
export async function uploadImage(
  file: File,
  folder: "logos" | "players" | "misc" = "misc"
): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("File too large (max 3 MB).");

  const contentType = inferContentType(file);
  const blob = await downscale(file);
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

  if (storageBucketConfigured) {
    try {
      return await uploadToFirebaseStorage(blob, contentType, folder, ext);
    } catch (storageErr) {
      // Fall back to inline data URL so admins are not stuck on "Uploading…"
      try {
        const dataUrl = await blobToDataUrl(blob);
        const hint =
          storageErr instanceof Error ? storageErr.message : "Storage unavailable.";
        // eslint-disable-next-line no-console
        console.warn("[upload] Storage failed, saved inline:", hint);
        return dataUrl;
      } catch {
        throw storageErr;
      }
    }
  }

  return blobToDataUrl(blob);
}
