import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import CategoryGrid from "../components/CategoryGrid";
import CategoryModal from "../components/CategoryModal";
import PdfViewerModal from "../components/PdfViewerModal";
import EventForm from "../components/EventForm";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { guestsLabel, type BeoEvent, type CategoryDef } from "../types";

function fmtDateLong(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function fmtTS(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<BeoEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CategoryDef["key"] | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // every other day that came from the same BEO upload (same contract number), so we can
  // offer "delete the whole BEO" when there's more than just this one day
  const [siblings, setSiblings] = useState<BeoEvent[] | null>(null);

  async function load() {
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error) {
      setError(error.message);
      return;
    }
    const ev = data as BeoEvent;
    setEvent(ev);

    if (ev.contract_number) {
      const { data: sibs } = await supabase
        .from("events")
        .select("*")
        .eq("contract_number", ev.contract_number);
      setSiblings((sibs as BeoEvent[]) ?? [ev]);
    } else {
      // no contract number saved (an older event, from before this field existed) — treat as standalone
      setSiblings([ev]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!event) return;
    if (!confirm("Delete this day from the board? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    setDeleting(false);
    if (error) {
      alert("Couldn't delete: " + error.message);
      return;
    }
    navigate("/");
  }

  async function handleDeleteAll() {
    if (!event || !siblings) return;
    const n = siblings.length;
    if (!confirm(`Delete this entire BEO — all ${n} days on the board — from "${event.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("contract_number", event.contract_number);
    setDeleting(false);
    if (error) {
      alert("Couldn't delete: " + error.message);
      return;
    }
    navigate("/");
  }

  const pdfUrl = event?.pdf_path
    ? supabase.storage.from("beo-pdfs").getPublicUrl(event.pdf_path).data.publicUrl
    : null;

  return (
    <div className="min-h-screen pb-16">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-[#1B2A38] font-medium mb-4 hover:underline"
        >
          ← Board
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!event && !error && <p className="text-ink-soft text-sm">Loading…</p>}

        {event && (
          <>
            <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-5 shadow-sm">
              <h1 className="font-display text-2xl font-semibold text-ink mb-3">
                {event.name || "Untitled event"}
              </h1>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-2">
                <DetailField label="Date" value={fmtDateLong(event.event_date)} />
                <DetailField label="Time" value={event.event_time || "—"} />
                <DetailField label="Room" value={event.room || "—"} />
                <DetailField label="Guests (Gtd / Exp)" value={guestsLabel(event)} />
              </dl>
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono text-ink-soft border-t border-neutral-100 pt-3 mt-2">
                <span>Uploaded {fmtTS(event.uploaded_at)}{event.created_by_name && ` by ${event.created_by_name}`}</span>
                <span>Updated {fmtTS(event.updated_at)}{event.updated_by_name && ` by ${event.updated_by_name}`}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {pdfUrl && (
                  <button onClick={() => setShowPdf(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-petrol-50">
                    📄 View original BEO
                  </button>
                )}
                {user && (
                  <>
                    <button onClick={() => setShowEdit(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-petrol-50 disabled:opacity-50">
                      Edit details
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm border border-red-600 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : (siblings && siblings.length > 1 ? "Delete this day" : "Delete")}
                    </button>
                    {siblings && siblings.length > 1 && (
                      <button
                        onClick={handleDeleteAll}
                        disabled={deleting}
                        className="text-sm border border-red-600 bg-red-50 text-red-700 font-medium rounded-md px-3 py-1.5 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : `Delete entire BEO (${siblings.length} days)`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <CategoryGrid event={event} onSelect={setActiveCat} />
          </>
        )}
      </main>

      {event && activeCat && (
        <CategoryModal event={event} catKey={activeCat} onClose={() => setActiveCat(null)} />
      )}
      {showPdf && pdfUrl && <PdfViewerModal url={pdfUrl} onClose={() => setShowPdf(false)} />}
      {showEdit && event && (
        <EventForm
          existing={event}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">{label}</dt>
      <dd className={`font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
