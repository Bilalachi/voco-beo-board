import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import EventRow from "../components/EventRow";
import { supabase } from "../lib/supabase";
import type { BeoEvent } from "../types";
import { compareEvents } from "../lib/sortEvents";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function fmtDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PastEvents() {
  const [events, setEvents] = useState<BeoEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .lt("event_date", todayISO());
      if (error) {
        setError(error.message);
        return;
      }
      // most recent past day first; within a day, still earliest-to-latest for readability
      const sorted = (data as BeoEvent[]).sort(
        (a, b) => b.event_date.localeCompare(a.event_date) || compareEvents(a, b)
      );
      setEvents(sorted);
    })();
  }, []);

  const groups = (() => {
    if (!events) return [];
    const out: { date: string; items: BeoEvent[] }[] = [];
    for (const ev of events) {
      const last = out[out.length - 1];
      if (last && last.date === ev.event_date) last.items.push(ev);
      else out.push({ date: ev.event_date, items: [ev] });
    }
    return out;
  })();

  return (
    <div className="min-h-screen pb-16">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/" className="text-sm text-[#1B2A38] font-medium mb-4 hover:underline inline-block">
          ← Board
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Previous events</h1>
        <p className="text-sm text-ink-soft mb-6">Events with a date before today.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            Couldn't load events: {error}
          </div>
        )}

        {events === null && !error && (
          <p className="text-ink-soft text-sm py-10 text-center">Loading…</p>
        )}

        {events && events.length === 0 && (
          <p className="text-ink-soft text-sm py-10 text-center">No previous events on the board yet.</p>
        )}

        {groups.map((g) => (
          <div key={g.date}>
            <div className="flex items-center gap-3 mt-7 mb-2.5 first:mt-1">
              <span className="bg-[#1B2A38] text-honey-500 font-mono text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded">
                {fmtDateLong(g.date)}
              </span>
              <span className="flex-1 h-px bg-[#1B2A38]" />
            </div>
            {g.items.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
