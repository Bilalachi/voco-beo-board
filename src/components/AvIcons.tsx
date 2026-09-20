import type { ReactNode } from "react";

interface AvIconDef {
  key: string;
  label: string;
  test: RegExp; // matched against the IT / AV requirement text
  icon: ReactNode;
}

const svgProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { display: "block" as const },
};

// To add another icon: copy one of these entries, change the words in `test`, and draw or paste an icon.
const ICONS: AvIconDef[] = [
{
  key: "teams",
  label: "Microsoft Teams",
  test: /\bteams\b|\bhybrid\b/i,
  icon: <img src={`${import.meta.env.BASE_URL}icons/teams.png`} width={24} height={24} alt="" style={{ display: "block" }} />,
},
  {
    key: "mic",
    label: "Microphone",
    test: /\bmics?\b|microphones?|lapel|lavalier/i,
    icon: (
      <svg {...svgProps} aria-hidden="true">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    key: "camera",
    label: "Camera / video call",
    test: /web\s?cam|\bcamera\b|video\s?(call|conf)|\bzoom\b/i,
    icon: (
      <svg {...svgProps} aria-hidden="true">
        <rect x="2" y="6" width="13" height="12" rx="2" />
        <path d="M15 10l7-4v12l-7-4z" />
      </svg>
    ),
  },
];

export function avIconsFor(details?: string) {
  const text = details || "";
  return ICONS.filter((i) => i.test.test(text));
}

/** Small icons for equipment mentioned in the IT / AV requirements. Renders nothing if none match. */
export default function AvIcons({ details, className = "" }: { details?: string; className?: string }) {
  const found = avIconsFor(details);
  if (!found.length) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-ink-soft ${className}`}>
      {found.map((i) => (
        <span key={i.key} title={i.label} aria-label={i.label} role="img" className="inline-flex items-center">
          {i.icon}
        </span>
      ))}
    </span>
  );
}
