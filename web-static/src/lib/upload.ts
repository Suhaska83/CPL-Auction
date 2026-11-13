import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase, storageBucketConfigured } from "@/firebase";
import { safeTrim } from "@/lib/safe-string";

const MAX_BYTES = 5 * 1024 * 1024; // file picker limit
const INLINE_MAX_DATA_URL_LEN = 1_200_000; // ~900 KB image as base64 in RTDB
const ALLOWED =
  /^(image\/(png|jpe?g|gif|webp|svg\+xml|x-png|pjpeg)|application\/octet-stream)$/;

type UploadFolder = "logos" | "players" | "captions" | "misc";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

function inferContentType(file: File): string {
  const t = safeTrim(file.type);
  if (t && ALLOWED.test(t) && t !== "application/octet-stream") {
    if (t === "image/x-png") return "image/png";
    if (t === "image/pjpeg") return "image/jpeg";
    return t;
  }
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

// Resize/compress so Storage + inline data URLs stay reliable.
async function downscale(
  file: File,
  opts: { maxDim: number; jpegQuality: number; forceEncode: boolean }
): Promise<{ blob: Blob; contentType: string }> {
  const rasterType = inferContentType(file);
  if (rasterType === "image/svg+xml" || rasterType === "image/gif") {
    return { blob: file, contentType: rasterType };
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
      15_000,
      "Image processing timed out — try a smaller JPG/PNG or paste a URL."
    );

    const longEdge = Math.max(img.width, img.height);
    const scale = Math.min(1, opts.maxDim / longEdge);
    const skipCanvas =
      !opts.forceEncode &&
      scale === 1 &&
      file.size <= 200 * 1024 &&
      longEdge <= opts.maxDim &&
      (rasterType === "image/jpeg" || rasterType === "image/webp");

    if (skipCanvas) {
      return { blob: file, contentType: rasterType };
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available in this browser.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outType =
      rasterType === "image/png" && file.size < 400 * 1024 ? "image/png" : "image/jpeg";
    const blob = await withTimeout(
      new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("Could not compress image."))),
          outType,
          opts.jpegQuality
        )
      ),
      10_000,
      "Image compression timed out."
    );
    return { blob, contentType: outType };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not encode image."));
    reader.readAsDataURL(blob);
  });
  if (dataUrl.length > INLINE_MAX_DATA_URL_LEN) {
    throw new Error(
      `Image is too large to store inline after compression (${Math.round(dataUrl.length / 1024)} KB encoded). ` +
        "Paste a public image URL, or enable Firebase Storage (Storage → Get started + publish storage.rules)."
    );
  }
  return dataUrl;
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
      30_000,
      "Firebase Storage upload timed out. Check Storage is enabled and storage.rules are published."
    );
    return await getDownloadURL(r);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error).message ?? "";
    if (code === "storage/unauthorized" || code === "storage/unauthenticated") {
      throw new Error(
        "Storage upload denied — stay signed in on Admin and publish storage.rules (Firebase → Storage → Rules)."
      );
    }
    if (
      code === "storage/unknown" ||
      code === "storage/object-not-found" ||
      code === "storage/bucket-not-found" ||
      /404|bucket|timed out/i.test(msg)
    ) {
      throw new Error(
        "Firebase Storage bucket not reachable — saving a compressed copy in the database instead."
      );
    }
    throw e;
  }
}

function folderEncodeOpts(folder: UploadFolder): {
  maxDim: number;
  jpegQuality: number;
  forceEncode: boolean;
} {
  if (folder === "misc" || folder === "logos") {
    return { maxDim: 768, jpegQuality: 0.85, forceEncode: true };
  }
  return { maxDim: 800, jpegQuality: 0.82, forceEncode: false };
}

/**
 * Returns a URL suitable for `photoUrl` / `logoUrl` / `managedByLogoUrl`.
 * Uses Firebase Storage when configured and working; otherwise stores a compressed
 * data URL in Realtime Database (no Storage billing required).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder = "misc"
): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("File too large (max 5 MB).");

  const opts = folderEncodeOpts(folder);
  let { blob, contentType } = await downscale(file, opts);
  const extFromType =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "jpg";
  const ext =
    (file.name.split(".").pop() ?? extFromType).toLowerCase().replace(/[^a-z0-9]/g, "") ||
    extFromType;

  if (storageBucketConfigured) {
    try {
      return await uploadToFirebaseStorage(blob, contentType, folder, ext);
    } catch (storageErr) {
      try {
        const tighter = await downscale(file, { maxDim: 512, jpegQuality: 0.78, forceEncode: true });
        blob = tighter.blob;
        contentType = tighter.contentType;
        return await blobToDataUrl(blob);
      } catch (inlineErr) {
        const storageMsg =
          storageErr instanceof Error ? storageErr.message : "Storage upload failed.";
        const inlineMsg = inlineErr instanceof Error ? inlineErr.message : String(inlineErr);
        throw new Error(`${storageMsg} ${inlineMsg}`);
      }
    }
  }

  return blobToDataUrl(blob);
}
