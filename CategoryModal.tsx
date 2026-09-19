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
  const d: any = (event as any)[catKey] || {};

  return (
    <Modal title={<span>{cat.label}</span>} onClose={onClose}>
      <div className="space-y-4">
        {d.time && <Field label="Time" value={d.time} />}
        {d.location && <Field label="Location" value={d.location} />}
        {"item" in d && <Field label="Items" value={d.item || "Nothing recorded yet."} />}
        {"menu" in d && <Field label="Menu" value={d.menu || "No menu recorded yet."} />}
        {"details" in d && <Field label="Details" value={d.details || "Nothing recorded yet."} />}
        {"setup" in d && d.setup && <Field label="Set-up style" value={d.setup} />}
        {"notes" in d && <Field label="Notes" value={d.notes || "No notes recorded yet."} />}
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-wide text-ink-soft mb-1">{label}</div>
      <p className="text-[14px] whitespace-pre-wrap leading-relaxed text-ink">{value}</p>
    </div>
  );
}
