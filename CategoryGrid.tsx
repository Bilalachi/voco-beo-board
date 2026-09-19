import { CATEGORIES, type BeoEvent, type CategoryDef } from "../types";

function previewFor(ev: BeoEvent, cat: CategoryDef): { preview: string; sub: string } {
  const d: any = (ev as any)[cat.key] || {};
  let preview = "";
  if (cat.key === "lunch" || cat.key === "dinner") preview = (d.menu || "").split("\n")[0];
  else if (cat.key === "avit") preview = (d.details || "").split("\n")[0];
  else if (cat.key === "banquet") preview = d.setup || (d.notes || "").split("\n")[0];
  else preview = (d.item || "").split("\n")[0];
  const sub = [d.time, d.location].filter(Boolean).join(" · ");
  return { preview, sub };
}

export default function CategoryGrid({
  event,
  onSelect,
}: {
  event: BeoEvent;
  onSelect: (key: CategoryDef["key"]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CATEGORIES.map((cat) => {
        const { preview, sub } = previewFor(event, cat);
        const empty = !preview;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`text-left bg-white border border-neutral-200 border-l-4 ${cat.colorClass.split(" ")[0]} rounded-md p-3.5 min-h-[92px] flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow`}
          >
            <span className={`font-mono text-[10.5px] font-semibold tracking-wide ${cat.colorClass.split(" ")[1]}`}>
              {cat.label.toUpperCase()}
            </span>
            <span className={`text-[13px] font-medium leading-snug ${empty ? "italic text-ink-faint" : "text-ink"}`}>
              {preview || "Not set — tap to add"}
            </span>
            {sub && <span className="font-mono text-[11px] text-ink-soft mt-auto">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
