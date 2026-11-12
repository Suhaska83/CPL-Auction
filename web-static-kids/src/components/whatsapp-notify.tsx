import { useMemo, useState } from "react";
import type { Player, TeamStats, Tournament } from "@/types";
import { formatINR } from "@/lib/format";
import {
  buildWhatsAppUrl,
  formatPhoneDisplay,
  normaliseWhatsAppNumber
} from "@/lib/whatsapp";

interface Props {
  tournament: Tournament;
  player: Player;
  team: TeamStats;
  soldPrice: number;
  onDismiss: () => void;
}

/**
 * Shown after a player is marked SOLD. Pre-fills a WhatsApp message to the player.
 */
export function WhatsAppNotify({
  tournament,
  player,
  team,
  soldPrice,
  onDismiss
}: Props) {
  const playerPhone = useMemo(() => normaliseWhatsAppNumber(player.phone), [player.phone]);

  const priceStr = `₹${formatINR(soldPrice)}`;
  const defaultPlayerMsg =
    `Hi ${player.name}! 🎉\n\n` +
    `Congratulations — you've been picked up by *${team.name}* ` +
    `for ${priceStr} in the ${tournament.name} auction.\n\n` +
    `Welcome to the squad! Best of luck for the season! 🏏`;

  const [playerMsg, setPlayerMsg] = useState(defaultPlayerMsg);

  return (
    <div className="card border-green-700/60 bg-green-900/15 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="font-display text-lg font-bold uppercase text-green-300">
          📣 Notify player on WhatsApp
        </div>
        <div className="text-xs text-white/60">
          {player.name} → {team.name} · {priceStr}
        </div>
        <button
          className="ml-auto text-xs text-white/60 hover:text-white"
          onClick={onDismiss}
          title="Hide this panel"
        >
          Dismiss ✕
        </button>
      </div>

      <NotifyCard
        title="Player"
        name={player.name}
        phoneRaw={player.phone}
        phoneDigits={playerPhone}
        message={playerMsg}
        onChange={setPlayerMsg}
      />

      <p className="mt-3 text-[11px] text-white/50">
        Clicking <b>Open WhatsApp</b> launches WhatsApp Web (or the app on mobile) with the
        message pre-filled — just tap <b>Send</b>. Add the player&apos;s phone on{" "}
        <b>Manage Players</b> if needed. Numbers without a country code use India (+91).
      </p>
    </div>
  );
}

function NotifyCard({
  title,
  name,
  phoneRaw,
  phoneDigits,
  message,
  onChange
}: {
  title: string;
  name: string;
  phoneRaw?: string | null;
  phoneDigits: string | null;
  message: string;
  onChange: (v: string) => void;
}) {
  const url = phoneDigits ? buildWhatsAppUrl(phoneDigits, message) : null;
  return (
    <div className="rounded-md border border-panel-border bg-panel/60 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
          {title}
        </div>
        <div className="truncate text-xs text-white/70">
          {name} · {phoneDigits ? formatPhoneDisplay(phoneRaw) : "No phone"}
        </div>
      </div>
      <textarea
        className="input h-32 w-full font-mono text-xs"
        value={message}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-success inline-flex items-center gap-1 text-xs"
          >
            <span>📱</span> Open WhatsApp
          </a>
        ) : (
          <span className="rounded bg-navy-800 px-2 py-1 text-[11px] text-white/50">
            Add a phone number on Manage Players to enable WhatsApp
          </span>
        )}
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={!message}
          onClick={() => navigator.clipboard?.writeText(message)}
          title="Copy message to clipboard"
        >
          Copy text
        </button>
      </div>
    </div>
  );
}
