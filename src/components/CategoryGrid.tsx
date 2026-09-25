import { CATEGORIES, type BeoEvent, type CategoryDef } from "../types";
import AvIcons from "./AvIcons";

interface Preview {
  lines: string[];
  sub: string;
  mono?: boolean;
  plain?: boolean;
  actionHint?: string;
}

const first = (s?: string) => (s || "").split("\n")[0];

function previewFor(ev: BeoEvent, cat: CategoryDef): Preview {
  if (!ev) return { lines: [""], sub: "" };

  switch (cat.key) {
    case "internet":
      return { lines: [ev.internet_code ? ev.internet_code.trim() : ""], sub: "", mono: true };

    case "banquet":
      return { lines: [ev.banquet?.setup || ""], sub: "" };

    case "avit":
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
      const menuText = d.menu || "";

      if (!menuText.trim()) {
        return { lines: [""], sub: [d.time, d.location].filter(Boolean).join(" · ") };
      }

      const lines = menuText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const foodLines = lines.filter(
        (l: string) => !/^(open soft drinks|soft drinks|juices|beverages|mineral water|open beverages)/i.test(l)
      );

      const titleMatch = foodLines.find((l: string) =>
        /set menu|buffet|UN Buffet|cocktail|reception|lebanese|platted|seated|menu/i.test(l)
      );

      const rawTitle = titleMatch || foodLines[0] || lines[0] || "Menu";
      const cleanTitle = rawTitle.replace(/[:\-–\s]+$/, "").trim();

      return {
        lines: [cleanTitle],
        actionHint: "· Tap to view details",
        sub: [d.time, d.location].filter(Boolean).join(" · "),
      };
    }

    case "am_break":
    case "pm_break": {
      const d = ev[cat.key] || {};
      
      // Safely check d.drinks with a string fallback to satisfy TypeScript
      if (d.drinks_time || d.drinks) {
        let drinksLabel = "Coffee & tea";
        const drinksStr = d.drinks || "";
        
        if (/welcome/i.test(drinksStr)) drinksLabel = "Welcome Coffee & Tea";
        else if (/continuous/i.test(drinksStr)) drinksLabel = "Continuous Coffee & Tea";

        const lines = [`${drinksLabel} · ${d.drinks_time || d.time || ""}`.replace(/ · $/, "")];
        
        if (d.item || d.time) {
          lines.push(`Coffee break · ${d.time || ""}`.replace(/ · $/, ""));
        }
        
        return { lines, sub: d.location || "" };
      }

      return { lines: [first(d.item)], sub: [d.time, d.location].filter(Boolean).join(" · ") };
    }

    default:
      return { lines: [""], sub: "" };
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
        const { lines, sub, mono, plain, actionHint } = previewFor(event, cat);
        const shown = lines.filter(Boolean);
        const empty = shown.length === 0;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`text-left bg-neutral-100 border border-honey-500 border-l-4 ${cat.colorClass.split(" ")[0]} rounded-md p-3.5 min-h-[92px] flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
          >
            <span className={`font-mono text-[10.5px] font-semibold tracking-wide ${cat.colorClass.split(" ")[1]}`}>
              {cat.label.toUpperCase()}
            </span>
            {cat.key === "avit" && <AvIcons details={event?.avit?.details} />}
            {empty ? (
              <span className="text-[13px] font-medium leading-snug italic text-ink-faint">
                Not set — Tap edit details to add
              </span>
            ) : (
              shown.map((line, i) => (
                <div key={i} className="leading-snug">
                  <span
                    className={`${
                      mono ? "font-mono text-[16px] font-semibold tracking-wide text-ink" : "text-[13px] font-semibold text-ink"
                    } ${plain ? "text-ink-soft font-normal" : ""}`}
                  >
                    {line}
                  </span>
                  {actionHint && i === 0 && (
                    <span className="text-[11.5px] font-normal italic text-ink-soft/75 ml-1.5">
                      {actionHint}
                    </span>
                  )}
                </div>
              ))
            )}
            {sub && <span className="font-mono text-[11px] text-ink-soft mt-auto">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
