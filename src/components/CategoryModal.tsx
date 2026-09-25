import Modal from "./Modal";
import { CATEGORIES, type BeoEvent, type CategoryDef } from "../types";

export default function CategoryModal({
  event,
  catKey,
  onClose,
}: {
  event: BeoEvent;
  catKey: CategoryDef["key"];
  onClose: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.key === catKey)!;
  const d: any = catKey === "internet" ? {} : (event as any)[catKey] || {};
  const isBreak = catKey === "am_break" || catKey === "pm_break";
  const splitBreak = isBreak && (d.drinks_time || d.drinks);

  return (
    <Modal title={<span>{cat.label}</span>} onClose={onClose}>
      <div className="space-y-4">
        {catKey === "internet" && (
          <Field label="Internet access code" value={event.internet_code || "No code recorded yet."} mono />
        )}

        {catKey === "payment" && (
          <>
            <Field label="Payment method" value={d.method || "Nothing recorded yet."} />
            <Field label="Charges" value={d.charges || "Nothing recorded yet."} />
            {d.notes && <Field label="Notes" value={d.notes} />}
          </>
        )}

        {splitBreak && (
          <>
            {d.location && <Field label="Location" value={d.location} />}
            <Part title="Coffee & tea" time={d.drinks_time || d.time} items={d.drinks} />
            {(d.item || d.time) && <Part title="Food" time={d.time} items={d.item} />}
          </>
        )}

        {catKey !== "internet" && catKey !== "payment" && !splitBreak && (
          <>
            {d.time && <Field label="Time" value={d.time} />}
            {d.location && <Field label="Location" value={d.location} />}
            {"item" in d && <Field label="Items" value={d.item || "Nothing recorded yet."} />}
            {"menu" in d && <Field label="Menu" value={d.menu || "No menu recorded yet."} />}
            {"details" in d && <Field label="Details" value={d.details || "Nothing recorded yet."} />}
            {"setup" in d && d.setup && <Field label="Set-up style" value={d.setup} />}
            {"notes" in d && <Field label="Notes" value={d.notes || "No notes recorded yet."} />}
          </>
        )}
      </div>
    </Modal>
  );
}

function Part({ title, time, items }: { title: string; time?: string; items?: string }) {
  return (
    <div className="border border-black rounded-md p-3.5 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink-soft">{title}</span>
        {time && <span className="font-mono text-[12px] text-ink">{time}</span>}
      </div>
      <p className="text-[14px] whitespace-pre-wrap leading-relaxed text-ink">{items || "Nothing recorded yet."}</p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-wide text-ink-soft mb-1">{label}</div>
      <p className={`whitespace-pre-wrap leading-relaxed text-ink ${mono ? "font-mono text-xl font-semibold tracking-wide" : "text-[14px]"}`}>
        {value}
      </p>
    </div>
  );
}
