import { safeTrim } from "@/lib/safe-string";

const MAX_BYTES = 5 * 1024 * 1024;
const INLINE_MAX_DATA_URL_LEN = 1_200_000;
const ALLOWED =
  /^(image\/(png|jpe?g|gif|webp|svg\+xml|x-png|pjpeg)|application\/octet-stream)$/;

type UploadFolder = "logos" | "players" | "captains" | "misc";

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

async function downscale(
  file: File,
  opts: { maxDim: number; jpegQuality: number; forceEncode: boolean }
): Promise<Blob> {
  const rasterType = inferContentType(file);
  if (rasterType === "image/svg+xml" || rasterType === "image/gif") {
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

    if (skipCanvas) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available in this browser.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outType =
      rasterType === "image/png" && file.size < 400 * 1024 ? "image/png" : "image/jpeg";
    return await withTimeout(
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
      `Image is still too large after compression (${Math.round(dataUrl.length / 1024)} KB). ` +
        "Use a smaller photo or paste a public image URL (e.g. from Google Drive with link sharing, Imgur)."
    );
  }
  return dataUrl;
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

const RETRY_OPTS: { maxDim: number; jpegQuality: number; forceEncode: boolean }[] = [
  { maxDim: 512, jpegQuality: 0.78, forceEncode: true },
  { maxDim: 384, jpegQuality: 0.72, forceEncode: true }
];

/**
 * Compress an image in the browser and return a data URL stored in Realtime Database.
 * Does not use Firebase Storage (Spark / free tier — RTDB only).
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder = "misc"
): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("File too large (max 5 MB).");

  const attempts = [folderEncodeOpts(folder), ...RETRY_OPTS];
  let lastErr: Error | null = null;

  for (const opts of attempts) {
    try {
      const blob = await downscale(file, opts);
      return await blobToDataUrl(blob);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error("Could not process image.");
}
