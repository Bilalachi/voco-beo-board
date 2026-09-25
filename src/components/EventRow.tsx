import { Link } from "react-router-dom";
import { guestsLabel, type BeoEvent } from "../types";
import AvIcons, { avIconsFor } from "./AvIcons";

export default function EventRow({ event }: { event: BeoEvent }) {
  const setup = event.banquet?.setup;
  const code = event.internet_code;

  // Check if room name contains "parrot" or "toucan"
  const roomName = (event.room || "").toLowerCase();
  const isParrotOrToucan = roomName.includes("parrot") || roomName.includes("toucan");

  return (
    <Link
      to={`/event/${event.id}`}
      className="block bg-white border border-neutral-200 rounded-lg px-3.5 py-3 mb-2 shadow-lg hover:border-honey-500 hover:shadow-lg hover:shadow-honey-500/40 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ease-out">
      {/* top: time on the left, guests on the right */}
      <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] text-ink-soft">
        <span>{event.event_time || "—"}</span>
        <span className="whitespace-nowrap">
          <span className="text-[9px] uppercase tracking-wide">Gtd / Exp </span>
          <b className="text-[12px] text-ink font-semibold">{guestsLabel(event)}</b>
        </span>
      </div>

      {/* middle: event name */}
      <div className="flex items-center gap-2 mt-1">
        <p className="flex-1 min-w-0 font-display font-semibold text-[15px] leading-snug text-ink break-words">
          {event.name || "Untitled event"}
        </p>
        <span className="text-neutral-300 text-xl leading-none">›</span>
      </div>

      {/* bottom: room, set-up, internet code, and icons */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-soft">
        <span className="font-medium text-ink">{event.room || "No room set"}</span>
        {setup && (
          <span>
            Set-up: <b className="font-semibold text-ink">{setup}</b>
          </span>
        )}
        {code && (
          <span>
            Wi-Fi: <b className="font-mono font-semibold text-ink">{code}</b>
          </span>
        )}
        {avIconsFor(event.avit?.details, isParrotOrToucan).length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            IT/AV: <AvIcons details={event.avit?.details} hideProjectors={isParrotOrToucan} />
          </span>
        )}
      </div>
    </Link>
  );
}