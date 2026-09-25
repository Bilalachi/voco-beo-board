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

// ==========================================
// HELPER FUNCTIONS (Formatting Dates & Times)
// ==========================================

/** Formats ISO date string (YYYY-MM-DD) into full readable date (e.g., "Monday, October 14") */
function fmtDateLong(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Formats ISO timestamp into short date and time (e.g., "Oct 14 · 02:30 PM") */
function fmtTS(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

// ==========================================
// MAIN COMPONENT: EventDetail
// ==========================================

export default function EventDetail() {
  // ------------------------------------------
  // 1. ROUTING & AUTH HOOKS
  // ------------------------------------------
  const { id } = useParams(); // Gets the current event ID from the URL (/event/:id)
  const { user } = useAuth(); // Checks if staff member is currently logged in
  const navigate = useNavigate(); // Used to redirect back to the board ("/") after deletion

  // ------------------------------------------
  // 2. COMPONENT STATE MANAGEMENT
  // ------------------------------------------
  const [event, setEvent] = useState<BeoEvent | null>(null); // Holds the main event record from Supabase
  const [error, setError] = useState<string | null>(null); // Stores fetch/network error messages
  const [activeCat, setActiveCat] = useState<CategoryDef["key"] | null>(null); // Tracks which category card is open in modal (e.g. "lunch", "avit")
  const [showPdf, setShowPdf] = useState(false); // Controls visibility of the original PDF viewer modal
  const [showEdit, setShowEdit] = useState(false); // Controls visibility of the event edit form modal
  const [deleting, setDeleting] = useState(false); // Loading state during Supabase deletion requests

  // Controls visibility of custom in-app delete confirmation popups
  const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Holds all other event days sharing the same contract_number from multi-day BEO uploads
  const [siblings, setSiblings] = useState<BeoEvent[] | null>(null);

  // ------------------------------------------
  // 3. DATA FETCHING (Supabase)
  // ------------------------------------------
  /** Fetches event details and searches for related multi-day event siblings */
  async function load() {
    // Fetch target event by ID
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error) {
      setError(error.message);
      return;
    }
    const ev = data as BeoEvent;
    setEvent(ev);

    // If event has a contract_number, fetch all sister days sharing that contract
    if (ev.contract_number) {
      const { data: sibs } = await supabase
        .from("events")
        .select("*")
        .eq("contract_number", ev.contract_number);
      setSiblings((sibs as BeoEvent[]) ?? [ev]);
    } else {
      setSiblings([ev]); // Fallback for legacy events missing contract numbers
    }
  }

  // Reload event data whenever the URL parameter (ID) changes
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ------------------------------------------
  // 4. ACTION HANDLERS (Delete Single / Delete All)
  // ------------------------------------------

  /** Deletes ONLY the currently viewed single day event from Supabase */
  async function confirmDeleteDay() {
    if (!event) return;
    setShowDeleteDayModal(false);
    setDeleting(true);

    const { error } = await supabase.from("events").delete().eq("id", event.id);
    setDeleting(false);

    if (error) {
      alert("Couldn't delete: " + error.message);
      return;
    }
    navigate("/"); // Return to main board after deletion
  }

  /** Deletes ALL days connected to this contract number from Supabase */
  async function confirmDeleteAll() {
    if (!event || !siblings) return;
    setShowDeleteAllModal(false);
    setDeleting(true);

    const { error } = await supabase.from("events").delete().eq("contract_number", event.contract_number);
    setDeleting(false);

    if (error) {
      alert("Couldn't delete: " + error.message);
      return;
    }
    navigate("/"); // Return to main board after deletion
  }

  // Computes public Supabase Storage URL for the attached BEO PDF file
  const pdfUrl = event?.pdf_path
    ? supabase.storage.from("beo-pdfs").getPublicUrl(event.pdf_path).data.publicUrl
    : null;

  // ------------------------------------------
  // 5. JSX RENDER TREE
  // ------------------------------------------
  return (
    <div className="min-h-screen pb-16">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Back navigation link */}
        <button
          onClick={() => navigate("/")}
          className="text-sm text-[#1B2A38] font-medium mb-4 hover:underline cursor-pointer"
        >
          ← Board
        </button>

        {/* Error / Loading feedback */}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!event && !error && <p className="text-ink-soft text-sm">Loading…</p>}

        {event && (
          <>
            {/* EVENT HEADER CARD */}
            <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-5 shadow-sm">
              <h1 className="font-display text-2xl font-semibold text-ink mb-3">
                {event.name || "Untitled event"}
              </h1>

              {/* Event metadata summary grid (Date, Time, Room, Guest count) */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm mb-2">
                <DetailField label="Date" value={fmtDateLong(event.event_date)} />
                <DetailField label="Time" value={event.event_time || "—"} />
                <DetailField label="Room" value={event.room || "—"} />
                <DetailField label="Guests (Gtd / Exp)" value={guestsLabel(event)} />
              </dl>

              {/* Upload and modification history footer */}
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono text-ink-soft border-t border-neutral-100 pt-3 mt-2">
                <span>Uploaded {fmtTS(event.uploaded_at)}{event.created_by_name && ` by ${event.created_by_name}`}</span>
                <span>Updated {fmtTS(event.updated_at)}{event.updated_by_name && ` by ${event.updated_by_name}`}</span>
              </div>

              {/* ACTION BUTTONS (View PDF, Edit, Delete) */}
              <div className="flex flex-wrap gap-2 mt-4">
                {pdfUrl && (
                  <button onClick={() => setShowPdf(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-petrol-50 cursor-pointer">
                    📄 View original BEO
                  </button>
                )}

                {/* Staff-only editing and deletion controls */}
                {user && (
                  <>
                    <button onClick={() => setShowEdit(true)} className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-petrol-50 disabled:opacity-50 cursor-pointer">
                      Edit details
                    </button>

                    {/* Trigger single day delete confirmation modal */}
                    <button
                      type="button"
                      onClick={() => setShowDeleteDayModal(true)}
                      disabled={deleting}
                      className="text-sm border border-red-300 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 cursor-pointer font-medium"
                    >
                      {deleting ? "Deleting…" : (siblings && siblings.length > 1 ? "Delete this day" : "Delete")}
                    </button>

                    {/* Trigger multi-day BEO delete confirmation modal if siblings exist */}
                    {siblings && siblings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteAllModal(true)}
                        disabled={deleting}
                        className="text-sm border border-red-600 bg-red-800 text-white font-medium rounded-md px-3 py-1.5 hover:bg-red-900 disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? "Deleting…" : `Delete entire BEO (${siblings.length} days)`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* CATEGORY GRID (Displays all 8 category cards: Internet, AV/IT, Banquet, Food, etc.) */}
            <CategoryGrid event={event} onSelect={setActiveCat} />
          </>
        )}
      </main>

      {/* ------------------------------------------ */}
      {/* 6. MODAL OVERLAYS                          */}
      {/* ------------------------------------------ */}

      {/* Category Detail Modal (Opens when tapping a category card) */}
      {event && activeCat && (
        <CategoryModal event={event} catKey={activeCat} onClose={() => setActiveCat(null)} />
      )}

      {/* Original BEO PDF Viewer Modal */}
      {showPdf && pdfUrl && <PdfViewerModal url={pdfUrl} onClose={() => setShowPdf(false)} />}

      {/* Event Edit Form Modal */}
      {showEdit && event && (
        <EventForm
          existing={event}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load(); // Reload updated data without full page refresh
          }}
        />
      )}

      {/* IN-APP MODAL: Delete Single Day Confirmation */}
      {showDeleteDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-bold text-neutral-900">
              Delete This Day?
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Are you sure you want to delete this day ({fmtDateLong(event?.event_date || "")}) from the board? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDayModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDay}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: Delete Entire BEO (All Days) Confirmation */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-bold text-neutral-900">
              Delete Entire BEO?
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              This will delete all <strong className="font-semibold text-neutral-900">{siblings?.length || 1} days</strong> on the board for <strong className="font-semibold text-neutral-900">"{event?.name}"</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAll}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                {deleting ? "Deleting…" : "Delete All Days"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: DetailField
// ==========================================

/** Renders a single labeled metadata field inside the event summary card */
function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">{label}</dt>
      <dd className={`font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}