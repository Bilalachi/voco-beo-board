import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import CategoryGrid from "../components/CategoryGrid";
import CategoryModal from "../components/CategoryModal";
import PdfViewerModal from "../components/PdfViewerModal";
import EventForm from "../components/EventForm";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { BeoEvent, CategoryDef } from "../types";

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

  async function load() {
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error) setError(error.message);
    else setEvent(data as BeoEvent);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!event) return;
    if (!confirm("Delete this event from the board? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
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
          className="text-sm text-petrol-500 font-medium mb-4 hover:underline"
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
                <DetailField label="Guests" value={event.guests?.toString() || "—"} />
                {event.internet_code && (
                  <DetailField label="Internet Access Code" value={event.internet_code} mono />
                )}
              </dl>
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono text-ink-soft border-t border-neutral-100 pt-3 mt-2">
                <span>Uploaded {fmtTS(event.uploaded_at)}{event.created_by_name && ` by ${event.created_by_name}`}</span>
                <span>Updated {fmtTS(event.updated_at)}{event.updated_by_name && ` by ${event.updated_by_name}`}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {pdfUrl && (
                  <button onClick={() => setShowPdf(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-neutral-50">
                    📄 View original BEO
                  </button>
                )}
                {user && (
                  <>
                    <button onClick={() => setShowEdit(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-neutral-50">
                      Edit details
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm border border-red-300 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
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
