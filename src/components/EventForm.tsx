import { FormEvent, useState } from "react";
import Modal from "./Modal";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { pdfToItems, pdfToLines, parseBeoLines } from "../lib/pdfParse";
import { parseBeoPages, beoToDrafts, type DayDraft } from "../lib/beoParser";
import type { BeoEvent } from "../types";

interface Props {
  existing?: BeoEvent;
  onClose: () => void;
  onSaved: (id: string) => void;
}

type FormState = {
  name: string;
  event_date: string;
  event_time: string;
  room: string;
  guests: string; // guaranteed
  guests_expected: string;
  internet_code: string;
  am_break_time: string; am_break_location: string; am_break_item: string; am_break_drinks_time: string; am_break_drinks: string;
  pm_break_time: string; pm_break_location: string; pm_break_item: string; pm_break_drinks_time: string; pm_break_drinks: string;
  lunch_time: string; lunch_location: string; lunch_menu: string;
  dinner_time: string; dinner_location: string; dinner_menu: string;
  avit_details: string;
  banquet_setup: string; banquet_notes: string;
  payment_method: string; payment_charges: string; payment_notes: string;
};

function initialState(ev?: BeoEvent): FormState {
  return {
    name: ev?.name || "",
    event_date: ev?.event_date || "",
    event_time: ev?.event_time || "",
    room: ev?.room || "",
    guests: ev?.guests?.toString() || "",
    guests_expected: ev?.guests_expected?.toString() || "",
    internet_code: ev?.internet_code || "",
    am_break_time: ev?.am_break?.time || "", am_break_location: ev?.am_break?.location || "", am_break_item: ev?.am_break?.item || "", am_break_drinks_time: ev?.am_break?.drinks_time || "", am_break_drinks: ev?.am_break?.drinks || "",
    pm_break_time: ev?.pm_break?.time || "", pm_break_location: ev?.pm_break?.location || "", pm_break_item: ev?.pm_break?.item || "", pm_break_drinks_time: ev?.pm_break?.drinks_time || "", pm_break_drinks: ev?.pm_break?.drinks || "",
    lunch_time: ev?.lunch?.time || "", lunch_location: ev?.lunch?.location || "", lunch_menu: ev?.lunch?.menu || "",
    dinner_time: ev?.dinner?.time || "", dinner_location: ev?.dinner?.location || "", dinner_menu: ev?.dinner?.menu || "",
    avit_details: ev?.avit?.details || "",
    banquet_setup: ev?.banquet?.setup || "", banquet_notes: ev?.banquet?.notes || "",
    payment_method: ev?.payment?.method || "", payment_charges: ev?.payment?.charges || "", payment_notes: ev?.payment?.notes || "",
  };
}

/** Turns one parsed BEO day into form values. */
function stateFromDay(d: DayDraft, base: FormState): FormState {
  return {
    name: d.name,
    event_date: d.event_date,
    event_time: d.event_time,
    room: d.room,
    guests: d.guests != null ? String(d.guests) : "",
    guests_expected: d.guests_expected != null ? String(d.guests_expected) : "",
    internet_code: base.internet_code, // not on the BEO
    am_break_time: d.am_break.time, am_break_location: d.am_break.location, am_break_item: d.am_break.item, am_break_drinks_time: d.am_break.drinks_time, am_break_drinks: d.am_break.drinks,
    pm_break_time: d.pm_break.time, pm_break_location: d.pm_break.location, pm_break_item: d.pm_break.item, pm_break_drinks_time: d.pm_break.drinks_time, pm_break_drinks: d.pm_break.drinks,
    lunch_time: d.lunch.time, lunch_location: d.lunch.location, lunch_menu: d.lunch.menu,
    dinner_time: d.dinner.time, dinner_location: d.dinner.location, dinner_menu: d.dinner.menu,
    avit_details: d.avit.details,
    banquet_setup: d.banquet.setup, banquet_notes: d.banquet.notes,
    payment_method: d.payment.method, payment_charges: d.payment.charges, payment_notes: d.payment.notes,
  };
}

function makeRecord(form: FormState) {
  return {
    name: form.name.trim(),
    event_date: form.event_date,
    event_time: form.event_time.trim(),
    room: form.room.trim(),
    guests: form.guests ? parseInt(form.guests, 10) : null,
    guests_expected: form.guests_expected ? parseInt(form.guests_expected, 10) : null,
    internet_code: form.internet_code.trim(),
    am_break: { time: form.am_break_time, location: form.am_break_location, item: form.am_break_item, drinks_time: form.am_break_drinks_time, drinks: form.am_break_drinks },
    pm_break: { time: form.pm_break_time, location: form.pm_break_location, item: form.pm_break_item, drinks_time: form.pm_break_drinks_time, drinks: form.pm_break_drinks },
    lunch: { time: form.lunch_time, location: form.lunch_location, menu: form.lunch_menu },
    dinner: { time: form.dinner_time, location: form.dinner_location, menu: form.dinner_menu },
    avit: { details: form.avit_details },
    banquet: { setup: form.banquet_setup, notes: form.banquet_notes },
    payment: { method: form.payment_method, charges: form.payment_charges, notes: form.payment_notes },
  };
}

function dayLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "No date";
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function EventForm({ existing, onClose, onSaved }: Props) {
  const { user, profile } = useAuth();
  const isEdit = !!existing;
  // One draft per day. A BEO PDF that covers several days creates several drafts.
  const [drafts, setDrafts] = useState<FormState[]>([initialState(existing)]);
  const [active, setActive] = useState(0);
  const form = drafts[active];
  const [parseStatus, setParseStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState(existing?.pdf_name || "");

  function set<K extends keyof FormState>(key: K, val: string) {
    setDrafts((ds) => ds.map((d, i) => (i === active ? { ...d, [key]: val } : d)));
  }

  async function handleFile(file: File) {
    setPdfFile(file);
    setPdfName(file.name);
    setParseStatus("Reading PDF…");
    try {
      const buf = await file.arrayBuffer();
      setParseStatus("Extracting text…");

      // 1. structured parser for the Voco BEO layout
      const { pages, pageWidth } = await pdfToItems(buf.slice(0));
      const beo = parseBeoPages(pages, pageWidth);
      const days = beoToDrafts(beo);

      if (days.length) {
        const chosen = isEdit
          ? [days.find((d) => d.event_date === existing!.event_date) ?? days[0]]
          : days;
        setDrafts((prev) => chosen.map((d, i) => stateFromDay(d, prev[i] ?? prev[0])));
        setActive(0);
        const extra = beo.warnings.length ? ` Note: ${beo.warnings.join(" ")}` : "";
        setParseStatus(
          (chosen.length > 1
            ? `Found ${chosen.length} days in this BEO. Check each day (tabs below), then save.`
            : "Auto-filled from PDF — please review every field below before saving.") + extra
        );
        return;
      }

      // 2. fallback: generic text heuristics for other layouts
      const { lines } = await pdfToLines(buf.slice(0));
      const parsed = parseBeoLines(lines);
      setDrafts((ds) =>
        ds.map((f, i) =>
          i !== 0
            ? f
            : {
                ...f,
                name: parsed.name || f.name,
                event_date: parsed.event_date || f.event_date,
                event_time: parsed.event_time || f.event_time,
                room: parsed.room || f.room,
                guests: parsed.guests != null ? String(parsed.guests) : f.guests,
                am_break_item: parsed.am_break?.item || f.am_break_item,
                pm_break_item: parsed.pm_break?.item || f.pm_break_item,
                lunch_menu: parsed.lunch?.menu || f.lunch_menu,
                dinner_menu: parsed.dinner?.menu || f.dinner_menu,
                avit_details: parsed.avit?.details || f.avit_details,
                banquet_notes: parsed.banquet?.notes || f.banquet_notes,
              }
        )
      );
      setParseStatus("Auto-filled from PDF (basic mode) — please review every field below before saving.");
    } catch (e) {
      console.error(e);
      setParseStatus("Couldn't auto-read this PDF. It's still attached — please fill fields in manually.");
    }
  }

  async function uploadPdf(tag: string): Promise<string> {
    const path = `${Date.now()}-${tag}-${pdfFile!.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("beo-pdfs").upload(path, pdfFile!, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) throw upErr;
    return path;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);

    // the browser only checks the visible day, so check every day here
    for (let i = 0; i < drafts.length; i++) {
      if (!drafts[i].name.trim() || !drafts[i].event_date) {
        setActive(i);
        setSaveError(`${drafts.length > 1 ? `Day ${i + 1}: ` : ""}please fill in the event name and date.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        let pdf_path = existing?.pdf_path || null;
        let pdf_name = existing?.pdf_name || null;
        if (pdfFile) {
          pdf_path = await uploadPdf("0");
          pdf_name = pdfFile.name;
        }
        const record = {
          ...makeRecord(drafts[0]),
          pdf_path,
          pdf_name,
          updated_by: user?.id,
          updated_by_name: profile?.displayName || "",
        };
        const { error } = await supabase.from("events").update(record).eq("id", existing!.id);
        if (error) throw error;
        onSaved(existing!.id);
      } else {
        // each day gets its own copy of the PDF, so deleting one day never breaks another
        const rows = [];
        for (let i = 0; i < drafts.length; i++) {
          let pdf_path: string | null = null;
          let pdf_name: string | null = null;
          if (pdfFile) {
            pdf_path = await uploadPdf(String(i));
            pdf_name = pdfFile.name;
          }
          rows.push({
            ...makeRecord(drafts[i]),
            pdf_path,
            pdf_name,
            updated_by: user?.id,
            updated_by_name: profile?.displayName || "",
            created_by: user?.id,
            created_by_name: profile?.displayName || "",
          });
        }
        const { data, error } = await supabase.from("events").insert(rows).select();
        if (error) throw error;
        onSaved(data[0].id);
      }
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong saving this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit event" : "New BEO"} onClose={onClose} wide>
      <div className="mb-4">
        <label className="block border-2 border-dashed border-neutral-300 rounded-md p-5 text-center text-sm text-ink-soft cursor-pointer hover:border-honey-500 transition-colors">
          {pdfName ? (
            <span className="text-ink font-medium">📄 {pdfName} {isEdit && "(tap to replace)"}</span>
          ) : (
            <span>Drop a BEO PDF here, or tap to choose a file</span>
          )}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {parseStatus && <p className="font-mono text-xs text-honey-700 mt-2">{parseStatus}</p>}
      </div>

      {drafts.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {drafts.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                i === active
                  ? "bg-honey-500 border-honey-500 text-ink"
                  : "bg-white border-neutral-300 text-ink-soft hover:border-honey-500"
              }`}
            >
              {dayLabel(d.event_date)}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Event Name" full value={form.name} onChange={(v) => set("name", v)} required />
          <TextField label="Date" type="date" value={form.event_date} onChange={(v) => set("event_date", v)} required />
          <TextField label="Time" placeholder="e.g. 6:00 PM – 9:00 PM" value={form.event_time} onChange={(v) => set("event_time", v)} />
          <TextField label="Meeting Room" value={form.room} onChange={(v) => set("room", v)} />
          <TextField label="Guaranteed Guests" type="number" value={form.guests} onChange={(v) => set("guests", v)} />
          <TextField label="Expected Guests" type="number" value={form.guests_expected} onChange={(v) => set("guests_expected", v)} />
          <TextField label="Internet Access Code" full value={form.internet_code} onChange={(v) => set("internet_code", v)} placeholder="Wi-Fi code for this event" />
        </div>

        <Fieldset legend="AM Coffee Break">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Location" full value={form.am_break_location} onChange={(v) => set("am_break_location", v)} />
            <TextField label="Coffee & Tea Time" value={form.am_break_drinks_time} onChange={(v) => set("am_break_drinks_time", v)} />
            <TextArea label="Coffee & Tea Items" full value={form.am_break_drinks} onChange={(v) => set("am_break_drinks", v)} />
            <TextField label="Food Time" value={form.am_break_time} onChange={(v) => set("am_break_time", v)} />
            <TextArea label="Food Items" full value={form.am_break_item} onChange={(v) => set("am_break_item", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="PM Coffee Break">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Location" full value={form.pm_break_location} onChange={(v) => set("pm_break_location", v)} />
            <TextField label="Coffee & Tea Time" value={form.pm_break_drinks_time} onChange={(v) => set("pm_break_drinks_time", v)} />
            <TextArea label="Coffee & Tea Items" full value={form.pm_break_drinks} onChange={(v) => set("pm_break_drinks", v)} />
            <TextField label="Food Time" value={form.pm_break_time} onChange={(v) => set("pm_break_time", v)} />
            <TextArea label="Food Items" full value={form.pm_break_item} onChange={(v) => set("pm_break_item", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="Lunch">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Time" value={form.lunch_time} onChange={(v) => set("lunch_time", v)} />
            <TextField label="Location" value={form.lunch_location} onChange={(v) => set("lunch_location", v)} />
            <TextArea label="Menu" full value={form.lunch_menu} onChange={(v) => set("lunch_menu", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="Dinner">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Time" value={form.dinner_time} onChange={(v) => set("dinner_time", v)} />
            <TextField label="Location" value={form.dinner_location} onChange={(v) => set("dinner_location", v)} />
            <TextArea label="Menu" full value={form.dinner_menu} onChange={(v) => set("dinner_menu", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="Set-Up">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Set-up Style" full value={form.banquet_setup} onChange={(v) => set("banquet_setup", v)} />
            <TextArea label="Notes" full value={form.banquet_notes} onChange={(v) => set("banquet_notes", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="Payment & Charges">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Payment Method" full value={form.payment_method} onChange={(v) => set("payment_method", v)} placeholder="e.g. AR, same day cash" />
            <TextArea label="Charges" full value={form.payment_charges} onChange={(v) => set("payment_charges", v)} />
            <TextArea label="Notes (VAT, parking...)" full value={form.payment_notes} onChange={(v) => set("payment_notes", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="IT / AV Requirements">
          <TextArea label="Details" full value={form.avit_details} onChange={(v) => set("avit_details", v)} />
        </Fieldset>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</p>
        )}

        <div className="flex gap-3 sticky bottom-0 bg-white pt-3 -mx-5 px-5 pb-1 border-t border-neutral-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-md border border-neutral-300 text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-honey-500 hover:bg-honey-600 disabled:opacity-60 text-ink font-semibold py-2.5 rounded-md transition-colors"
          >
            {saving ? "Saving…" : drafts.length > 1 ? `Save ${drafts.length} days to board` : "Save to board"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-neutral-200 rounded-md p-3.5">
      <legend className="font-mono text-[10.5px] uppercase tracking-wide text-petrol-500 px-1.5">{legend}</legend>
      {children}
    </fieldset>
  );
}

function TextField({
  label, value, onChange, type = "text", full, required, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; full?: boolean; required?: boolean; placeholder?: string }) {
  return (
    <label className={`block text-sm ${full ? "col-span-2" : ""}`}>
      <span className="block font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">{label}</span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
      />
    </label>
  );
}

function TextArea({
  label, value, onChange, full,
}: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "col-span-2" : ""}`}>
      <span className="block font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500 resize-y"
      />
    </label>
  );
}
