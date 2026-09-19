import { Link } from "react-router-dom";
import type { BeoEvent } from "../types";

export default function EventRow({ event }: { event: BeoEvent }) {
  return (
    <Link
      to={`/event/${event.id}`}
      className="flex items-center gap-4 bg-white border border-neutral-200 rounded-lg px-4 py-3.5 mb-2 shadow-sm hover:border-honey-500 hover:shadow-md transition-all"
    >
      <div className="font-mono text-sm text-ink-soft min-w-[68px]">
        {event.event_time || "—"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[15px] text-ink truncate">
          {event.name || "Untitled event"}
        </p>
        <p className="text-xs text-ink-soft">
          <b className="text-ink font-medium">{event.room || "No room set"}</b>
        </p>
      </div>
      <div className="text-center bg-neutral-100 border border-neutral-200 rounded-md px-2.5 py-1.5 min-w-[52px]">
        <div className="font-mono font-semibold text-sm text-ink">{event.guests ?? "—"}</div>
        <div className="text-[8px] uppercase tracking-wide text-ink-soft font-semibold">Guests</div>
      </div>
      <div className="text-neutral-300 text-xl">›</div>
    </Link>
  );
}
