import type { ReactNode } from "react";

interface AvIconDef {
  key: string;
  label: string;
  test: RegExp; // matched against the IT / AV requirement text
  icon: ReactNode;
  countable?: boolean; // true = show one icon per unit ("3 mics" -> 3 icons)
  fallback?: boolean; // countable icons only: used when no more specific icon matches the same phrase
}

const MAX_ICONS = 10; // safety limit so a typo like "200 mics" doesn't fill the screen

// To add another icon: copy one of these entries, change the words in `test`, and draw or paste an icon.
// Add `countable: true` if you want one icon per unit (like the microphones).
const ICONS: AvIconDef[] = [
  
    {
    key: "internet",
    label: "Internet Access",
    test: /\binternet\b/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/internet.png`} width={16} height={16} alt="" style={{ display: "block" }} />,
  },
  {
    key: "projector",
    label: "projector",
    test: /\bprojector\b/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/projector.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "projector screen",
    label: "Screen",
    test: /\bprojector and screen\b/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/screen.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "screen",
    label: "Interactive Screen / Smartboard",
    test: /\bInteractive\b/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/smart-tv.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "Macbook",
    label: "Apple Macbook",
    test: /\bapple\b|Macbook/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/apple.png`} width={20} height={20} alt="" style={{ display: "block" }} />,
  },
  {
    key: "clicker pointer",
    label: "Clicker / Pointer / presentation remote",
    test: /\bclicker\b|pointer/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/clicker.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "mic",
    label: "Handheld Microphone",
    test: /\bmics?\b|microphones?|handheld/i,
    countable: true,
    fallback: true,
    icon: <img src={`${import.meta.env.BASE_URL}icons/handheld.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "headset",
    label: "Headset / Neck Microphone",
    test: /\bhead?\b|headset?|neck/i,
    countable: true,
    icon: <img src={`${import.meta.env.BASE_URL}icons/headset.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
   {
    key: "clip",
    label: "Clip microphone / lavalier",
    test: /\bclip?\b|lavalier?/i,
    countable: true,
    icon: <img src={`${import.meta.env.BASE_URL}icons/clip.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  {
    key: "podium",
    label: "Microphone on Podium",
    test: /podium|lectern/i,
    countable: true,
    icon: <img src={`${import.meta.env.BASE_URL}icons/podium.png`} width={20} height={20} alt="" style={{ display: "block" }} />,
  },
  {
    key: "extension",
    label: "Extension Cord / Power Strip",
    test: /extension|power strip/i,
    countable: true,
    icon: <img src={`${import.meta.env.BASE_URL}icons/extension.png`} width={20} height={20} alt="" style={{ display: "block" }} />,
  },
  {
    key: "teams",
    label: "Microsoft Teams",
    test: /\bteams\b|hybrid/i,
    icon: <img src={`${import.meta.env.BASE_URL}icons/teams.png`} width={18} height={18} alt="" style={{ display: "block" }} />,
  },
  
];

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, pair: 2, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "i");

/** The quantity written in one phrase: "3 mics", "mics x3", "two headsets", "headset (2)". No number = 1. */
function numberIn(phrase: string): number {
  for (const m of phrase.matchAll(/\d+/g)) {
    const i = m.index ?? 0;
    const prev = phrase[i - 1] ?? "";
    const after = phrase.slice(i + m[0].length);
    // skip clock times and decimals like "10:30", "10.5", "9 am"
    if (prev === ":" || prev === "." || /^[:.]\d/.test(after) || /^\s?(am|pm)\b/i.test(after)) continue;
    return parseInt(m[0], 10);
  }
  const w = phrase.match(WORD_RE);
  return w ? NUMBER_WORDS[w[1].toLowerCase()] : 1;
}

/**
 * Splits the text into phrases (by line, comma, "and", "+", "&"), gives each phrase to the
 * first countable icon whose words match it, and adds up the numbers per icon.
 * Specific icons (headset, clip, podium) are checked before the general microphone.
 */
function countUnits(text: string): Record<string, number> {
  const countable = ICONS.filter((i) => i.countable);
  const order = [...countable.filter((i) => !i.fallback), ...countable.filter((i) => i.fallback)];
  const counts: Record<string, number> = {};
  for (const phrase of text.split(/[\n\r,;+&]|\band\b/i)) {
    const icon = order.find((i) => i.test.test(phrase));
    if (icon) counts[icon.key] = (counts[icon.key] || 0) + numberIn(phrase);
  }
  return counts;
}

export function avIconsFor(details?: string) {
  const text = details || "";
  const counts = countUnits(text);
  return ICONS.flatMap((def) => {
    if (def.countable) {
      const n = counts[def.key] || 0;
      return n > 0 ? [{ def, n: Math.min(n, MAX_ICONS) }] : [];
    }
    return def.test.test(text) ? [{ def, n: 1 }] : [];
  });
}

/** Small icons for equipment mentioned in the IT / AV requirements. Renders nothing if none match. */
export default function AvIcons({ details, className = "" }: { details?: string; className?: string }) {
  const found = avIconsFor(details);
  if (!found.length) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 text-ink-soft ${className}`}>
      {found.map(({ def, n }) =>
        Array.from({ length: n }, (_, k) => (
          <span
            key={`${def.key}-${k}`}
            title={n > 1 ? `${def.label} ×${n}` : def.label}
            aria-label={def.label}
            role="img"
            className="inline-flex items-center"
          >
            {def.icon}
          </span>
        ))
      )}
    </span>
  );
}
