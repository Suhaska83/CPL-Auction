import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase } from "@/firebase";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = /^image\/(png|jpe?g|gif|webp|svg\+xml)$/;

// Basic client-side downscale so we don't upload 8-megapixel phone photos.
async function downscale(file: File, maxDim = 800): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 400 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("Canvas encode failed"))),
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.85
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(
  file: File,
  folder: "logos" | "players" | "misc" = "misc"
): Promise<string> {
  if (!ALLOWED.test(file.type)) throw new Error("Only PNG / JPG / WebP / GIF / SVG allowed.");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 3 MB).");

  const blob = await downscale(file);
  const ext = (file.name.split(".").pop() ?? "img").toLowerCase().slice(0, 5);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { storage } = getFirebase();
  const r = storageRef(storage, path);
  await uploadBytes(r, blob, { contentType: file.type });
  return await getDownloadURL(r);
}
