/** Coerce RTDB / form values to a trimmed string (never throws on undefined). */
export function safeTrim(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

export function safeLower(value: unknown): string {
  return safeTrim(value).toLowerCase();
}
