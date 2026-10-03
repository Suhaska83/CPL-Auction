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
 * Shown immediately after a player is marked SOLD. Pre-fills two WhatsApp
 * messages (one to the player, one to the team captain) that the admin can
 * tweak and then open in WhatsApp Web / app with a single click.
 *
 * This uses the free `wa.me` click-to-chat URL — no backend, no API keys,
 * works for any phone number worldwide.
 */
export function WhatsAppNotify({
  tournament,
  player,
  team,
  soldPrice,
  onDismiss
}: Props) {
  const playerPhone = useMemo(() => normaliseWhatsAppNumber(player.phone), [player.phone]);
  const captainPhone = useMemo(
    () => normaliseWhatsAppNumber(team.captainPhone),
    [team.captainPhone]
  );

  const priceStr = `₹${formatINR(soldPrice)}`;
  const defaultPlayerMsg =
    `Hi ${player.name}! 🎉\n\n` +
    `Congratulations — you've been picked up by *${team.name}* ` +
    `for ${priceStr} in the ${tournament.name} auction.\n\n` +
    (team.captainName ? `Your captain is ${team.captainName}` : `Welcome to the squad`) +
    (team.captainPhone ? ` (${formatPhoneDisplay(team.captainPhone)}).` : `.`) +
    `\n\nBest of luck for the season! 🏏`;

  const defaultCaptainMsg =
    `Hi ${team.captainName || "Captain"}! 🏏\n\n` +
    `Your team *${team.name}* has acquired *${player.name}* ` +
    `(#${player.number}, ${player.skill}) for ${priceStr} ` +
    `in the ${tournament.name} auction.\n\n` +
    (player.phone
      ? `Player's contact: ${formatPhoneDisplay(player.phone)}\n\n`
      : "") +
    `Welcome them to the squad!`;

  const [playerMsg, setPlayerMsg] = useState(defaultPlayerMsg);
  const [captainMsg, setCaptainMsg] = useState(defaultCaptainMsg);

  return (
    <div className="card border-green-700/60 bg-green-900/15 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="font-display text-lg font-bold uppercase text-green-300">
          📣 Notify on WhatsApp
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NotifyCard
          title="Player"
          name={player.name}
          phoneRaw={player.phone}
          phoneDigits={playerPhone}
          message={playerMsg}
          onChange={setPlayerMsg}
        />
        <NotifyCard
          title="Captain"
          name={team.captainName || "—"}
          phoneRaw={team.captainPhone}
          phoneDigits={captainPhone}
          message={captainMsg}
          onChange={setCaptainMsg}
        />
      </div>

      <p className="mt-3 text-[11px] text-white/50">
        Clicking <b>Open WhatsApp</b> launches WhatsApp Web (or the app on mobile) with the
        message pre-filled — just tap <b>Send</b>. Numbers without a country code are treated
        as India (+91). Edit a message above to customise it before sending.
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
            Add a phone number to enable WhatsApp
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
