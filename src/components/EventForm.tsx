import { FormEvent, useState } from "react";
import Modal from "./Modal";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { pdfToLines, parseBeoLines } from "../lib/pdfParse";
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
  guests: string;
  internet_code: string;
  am_break_time: string; am_break_location: string; am_break_item: string;
  pm_break_time: string; pm_break_location: string; pm_break_item: string;
  lunch_time: string; lunch_location: string; lunch_menu: string;
  dinner_time: string; dinner_location: string; dinner_menu: string;
  avit_details: string;
  banquet_setup: string; banquet_notes: string;
};

function initialState(ev?: BeoEvent): FormState {
  return {
    name: ev?.name || "",
    event_date: ev?.event_date || "",
    event_time: ev?.event_time || "",
    room: ev?.room || "",
    guests: ev?.guests?.toString() || "",
    internet_code: ev?.internet_code || "",
    am_break_time: ev?.am_break?.time || "", am_break_location: ev?.am_break?.location || "", am_break_item: ev?.am_break?.item || "",
    pm_break_time: ev?.pm_break?.time || "", pm_break_location: ev?.pm_break?.location || "", pm_break_item: ev?.pm_break?.item || "",
    lunch_time: ev?.lunch?.time || "", lunch_location: ev?.lunch?.location || "", lunch_menu: ev?.lunch?.menu || "",
    dinner_time: ev?.dinner?.time || "", dinner_location: ev?.dinner?.location || "", dinner_menu: ev?.dinner?.menu || "",
    avit_details: ev?.avit?.details || "",
    banquet_setup: ev?.banquet?.setup || "", banquet_notes: ev?.banquet?.notes || "",
  };
}

export default function EventForm({ existing, onClose, onSaved }: Props) {
  const { user, profile } = useAuth();
  const isEdit = !!existing;
  const [form, setForm] = useState<FormState>(initialState(existing));
  const [parseStatus, setParseStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState(existing?.pdf_name || "");

  function set<K extends keyof FormState>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleFile(file: File) {
    setPdfFile(file);
    setPdfName(file.name);
    setParseStatus("Reading PDF…");
    try {
      const buf = await file.arrayBuffer();
      setParseStatus("Extracting text…");
      const { lines } = await pdfToLines(buf.slice(0));
      const parsed = parseBeoLines(lines);
      setForm((f) => ({
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
      }));
      setParseStatus("Auto-filled from PDF — please review every field below before saving.");
    } catch (e) {
      console.error(e);
      setParseStatus("Couldn't auto-read this PDF. It's still attached — please fill fields in manually.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      let pdf_path = existing?.pdf_path || null;
      let pdf_name = existing?.pdf_name || null;

      if (pdfFile) {
        const path = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("beo-pdfs").upload(path, pdfFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        pdf_path = path;
        pdf_name = pdfFile.name;
      }

      const record = {
        name: form.name.trim(),
        event_date: form.event_date,
        event_time: form.event_time.trim(),
        room: form.room.trim(),
        guests: form.guests ? parseInt(form.guests, 10) : null,
        internet_code: form.internet_code.trim(),
        am_break: { time: form.am_break_time, location: form.am_break_location, item: form.am_break_item },
        pm_break: { time: form.pm_break_time, location: form.pm_break_location, item: form.pm_break_item },
        lunch: { time: form.lunch_time, location: form.lunch_location, menu: form.lunch_menu },
        dinner: { time: form.dinner_time, location: form.dinner_location, menu: form.dinner_menu },
        avit: { details: form.avit_details },
        banquet: { setup: form.banquet_setup, notes: form.banquet_notes },
        pdf_path,
        pdf_name,
        updated_by: user?.id,
        updated_by_name: profile?.displayName || "",
      };

      if (isEdit) {
        const { error } = await supabase.from("events").update(record).eq("id", existing!.id);
        if (error) throw error;
        onSaved(existing!.id);
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...record, created_by: user?.id, created_by_name: profile?.displayName || "" })
          .select()
          .single();
        if (error) throw error;
        onSaved(data.id);
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Event Name" full value={form.name} onChange={(v) => set("name", v)} required />
          <TextField label="Date" type="date" value={form.event_date} onChange={(v) => set("event_date", v)} required />
          <TextField label="Time" placeholder="e.g. 6:00 PM – 9:00 PM" value={form.event_time} onChange={(v) => set("event_time", v)} />
          <TextField label="Meeting Room" value={form.room} onChange={(v) => set("room", v)} />
          <TextField label="Guest Count" type="number" value={form.guests} onChange={(v) => set("guests", v)} />
          <TextField label="Internet Access Code" value={form.internet_code} onChange={(v) => set("internet_code", v)} placeholder="Wi-Fi code for this event" />
        </div>

        <Fieldset legend="AM Coffee Break">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Time" value={form.am_break_time} onChange={(v) => set("am_break_time", v)} />
            <TextField label="Location" value={form.am_break_location} onChange={(v) => set("am_break_location", v)} />
            <TextArea label="Items" full value={form.am_break_item} onChange={(v) => set("am_break_item", v)} />
          </div>
        </Fieldset>

        <Fieldset legend="PM Coffee Break">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Time" value={form.pm_break_time} onChange={(v) => set("pm_break_time", v)} />
            <TextField label="Location" value={form.pm_break_location} onChange={(v) => set("pm_break_location", v)} />
            <TextArea label="Items" full value={form.pm_break_item} onChange={(v) => set("pm_break_item", v)} />
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

        <Fieldset legend="IT / AV Requirements">
          <TextArea label="Details" full value={form.avit_details} onChange={(v) => set("avit_details", v)} />
        </Fieldset>

        <Fieldset legend="Banquet Set-Up">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Set-up Style" full value={form.banquet_setup} onChange={(v) => set("banquet_setup", v)} />
            <TextArea label="Notes" full value={form.banquet_notes} onChange={(v) => set("banquet_notes", v)} />
          </div>
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
            {saving ? "Saving…" : "Save to board"}
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
