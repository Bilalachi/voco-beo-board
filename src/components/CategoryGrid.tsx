import { CATEGORIES, type BeoEvent, type CategoryDef } from "../types";
import AvIcons from "./AvIcons";

interface Preview {
  lines: string[];
  sub: string;
  mono?: boolean; // show the main line in a monospace, larger style (internet code)
  plain?: boolean; // never show the "not set" italic style (used for "tap to view")
}

const first = (s?: string) => (s || "").split("\n")[0];

function previewFor(ev: BeoEvent, cat: CategoryDef): Preview {
  switch (cat.key) {
    case "internet":
      return { lines: [ev.internet_code || ""], sub: "", mono: true };
    case "banquet":
      return { lines: [ev.banquet?.setup || ""], sub: "" };
    case "avit":
      // details are only shown after tapping the box
      return { lines: [ev.avit?.details ? "Tap to view more details" : ""], sub: "", plain: true };
    case "payment": {
      const d = ev.payment || {};
      return {
        lines: [d.method ? `Payment: ${d.method}` : ""],
        sub: first(d.charges),
      };
    }
    case "lunch":
    case "dinner": {
      const d = ev[cat.key] || {};
      return { lines: [first(d.menu)], sub: [d.time, d.location].filter(Boolean).join(" · ") };
    }
    case "am_break":
    case "pm_break": {
      const d = ev[cat.key] || {};
      if (d.drinks_time || d.drinks) {
        // coffee & tea and food are shown separately, each with its own time
        const lines = [`Coffee & tea · ${d.drinks_time || d.time || ""}`.replace(/ · $/, "")];
        if (d.item || d.time) lines.push(`Food · ${d.time || ""}`.replace(/ · $/, ""));
        return { lines, sub: d.location || "" };
      }
      return { lines: [first(d.item)], sub: [d.time, d.location].filter(Boolean).join(" · ") };
    }
  }
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
        const { lines, sub, mono, plain } = previewFor(event, cat);
        const shown = lines.filter(Boolean);
        const empty = shown.length === 0;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`text-left bg-neutral-100 border border-honey-500 border-l-4 ${cat.colorClass.split(" ")[0]} rounded-md p-3.5 min-h-[92px] flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow`}
          >
            <span className={`font-mono text-[10.5px] font-semibold tracking-wide ${cat.colorClass.split(" ")[1]}`}>
     {cat.label.toUpperCase()}
   </span>
   {cat.key === "avit" && <AvIcons details={event.avit?.details} />}
            {empty ? (
              <span className="text-[13px] font-medium leading-snug italic text-ink-faint">
                Not set — Tap edit details to add
              </span>
            ) : (
              shown.map((line, i) => (
                <span
                  key={i}
                  className={`leading-snug text-ink ${
                    mono ? "font-mono text-[16px] font-semibold tracking-wide" : "text-[13px] font-medium"
                  } ${plain ? "text-ink-soft" : ""}`}
                >
                  {line}
                </span>
              ))
            )}
            {sub && <span className="font-mono text-[11px] text-ink-soft mt-auto">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
