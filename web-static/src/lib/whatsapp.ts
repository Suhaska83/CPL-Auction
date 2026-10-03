// Default to India +91 — change to the country code where your tournament runs.
const DEFAULT_COUNTRY_CODE = "91";

/**
 * Normalise a user-entered phone number into the digits-only international
 * format WhatsApp's wa.me links require.
 *
 * Accepts common inputs like:
 *   "9876543210"           → "919876543210"  (default country code prepended)
 *   "+91 98765 43210"      → "919876543210"
 *   "091-9876543210"       → "919876543210"  (leading 0 stripped)
 *   "+1 (415) 555-1234"    → "14155551234"
 *
 * Returns null if the result isn't a plausible international number
 * (minimum 10 digits after cleaning).
 */
export function normaliseWhatsAppNumber(
  raw: string | null | undefined,
  defaultCountryCode = DEFAULT_COUNTRY_CODE
): string | null {
  if (!raw) return null;
  // Strip everything that isn't a digit.
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  // Strip a leading country-code "00" (e.g. 0091...) and treat as "+91..."
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Strip a single leading "0" (local-trunk prefix inside a country).
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  // If exactly 10 digits, assume local → prepend the default country code.
  if (digits.length === 10) digits = defaultCountryCode + digits;
  if (digits.length < 10) return null;
  return digits;
}

/**
 * Build a WhatsApp click-to-chat URL. Opens the user's WhatsApp Web or app
 * with the recipient already selected and the message pre-filled; the admin
 * only has to tap "Send".
 *
 * https://faq.whatsapp.com/5913398998672934
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  // wa.me is the official shortlink; it works on web + mobile with no API key.
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Pretty-print a phone number as "+91 98765 43210" for display.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "—";
  const n = normaliseWhatsAppNumber(phone);
  if (!n) return phone;
  // Try to split as "CC rest" with CC=2-3 chars, then group rest in 5-digit chunks.
  const cc = n.length > 10 ? n.slice(0, n.length - 10) : "";
  const rest = n.slice(-10);
  const grouped = rest.replace(/(\d{5})(\d{5})/, "$1 $2");
  return cc ? `+${cc} ${grouped}` : grouped;
}
