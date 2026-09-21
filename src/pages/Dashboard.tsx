import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import EventRow from "../components/EventRow";
import EventForm from "../components/EventForm";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
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
function fmtDateShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<BeoEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", todayISO());
    if (error) setError(error.message);
    // sorted here (not in the database) because the time is text like "9:00 AM"
    else setEvents((data as BeoEvent[]).sort(compareEvents));
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("events-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayISO();
  const groups = useMemo(() => {
    if (!events) return [];
    const out: { date: string; items: BeoEvent[] }[] = [];
    for (const ev of events) {
      const last = out[out.length - 1];
      if (last && last.date === ev.event_date) last.items.push(ev);
      else out.push({ date: ev.event_date, items: [ev] });
    }
    return out;
  }, [events]);

  return (
    <div className="min-h-screen pb-16">
      <Header onNewBeo={user ? () => setShowForm(true) : undefined} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            Couldn't load events: {error}
          </div>
        )}

        {events === null && !error && (
          <p className="text-ink-soft text-sm py-10 text-center">Loading board…</p>
        )}

        {events && events.length === 0 && (
          <div className="text-center py-20 text-ink-soft">
            <p className="font-display text-lg text-ink font-medium mb-1">
              No upcoming events on the board
            </p>
            {user ? (
              <p>Tap "+ New BEO" above to upload one.</p>
            ) : (
              <p>Check back once staff have uploaded upcoming BEOs.</p>
            )}
          </div>
        )}

        {groups.map((g) => (
          <div key={g.date}>
            <div className="flex items-center gap-3 mt-7 mb-2.5 first:mt-1">
              <span className="bg-[#1B2A38] text-honey-500 font-mono text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded">
                {g.date === today ? `TODAY — ${fmtDateShort(g.date)}` : fmtDateLong(g.date)}
              </span>
              <span className="flex-1 h-px bg-[#1B2A38]" />
            </div>
            {g.items.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        ))}
      </main>

      {showForm && <EventForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
