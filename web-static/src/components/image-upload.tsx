import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: "logos" | "players" | "misc";
  label?: string;
  aspect?: "square" | "landscape";
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Image",
  aspect = "square"
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box =
    aspect === "square"
      ? "h-28 w-28"
      : "h-24 w-40";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
          {label}
        </span>
        {value && (
          <button
            type="button"
            className="text-[11px] text-red-300 hover:text-red-200"
            onClick={() => onChange(null)}
            disabled={busy}
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex items-start gap-3">
        <div
          className={`${box} shrink-0 overflow-hidden rounded-md border border-dashed border-panel-border bg-navy-900/60`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[11px] text-white/40">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
            </button>
            <span className="text-[11px] text-white/40">or paste URL below</span>
          </div>
          <input
            className="input"
            placeholder="https://…"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={busy}
          />
          {err && <div className="text-xs text-red-300">{err}</div>}
        </div>
      </div>
    </div>
  );
}
