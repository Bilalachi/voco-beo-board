export interface MealSection {
  time?: string;         // for breaks: the FOOD time
  location?: string;
  item?: string;         // used by am_break / pm_break (food items)
  menu?: string;         // used by lunch / dinner
  drinks_time?: string;  // breaks only: coffee & tea time (may be a longer "continuous" window)
  drinks?: string;       // breaks only: coffee & tea items
}

export interface AvitSection {
  details?: string;
}

export interface BanquetSection {
  setup?: string;
  notes?: string;
}

export interface PaymentSection {
  method?: string;
  charges?: string;
  notes?: string;
}

export interface BeoEvent {
  id: string;
  name: string;
  event_date: string;   // YYYY-MM-DD
  event_time: string;
  room: string;
  guests: number | null;           // guaranteed
  guests_expected: number | null;  // expected
  internet_code: string;

  am_break: MealSection;
  pm_break: MealSection;
  lunch: MealSection;
  dinner: MealSection;
  avit: AvitSection;
  banquet: BanquetSection;
  payment: PaymentSection;

  pdf_path: string | null;
  pdf_name: string | null;

  created_by: string | null;
  created_by_name: string;
  uploaded_at: string;

  updated_by: string | null;
  updated_by_name: string;
  updated_at: string;
}

export type BeoEventDraft = Omit<
  BeoEvent,
  | "id"
  | "created_by"
  | "uploaded_at"
  | "updated_by"
  | "created_by_name"
  | "updated_by_name"
>;

export interface CategoryDef {
  key: "internet" | "banquet" | "am_break" | "pm_break" | "lunch" | "dinner" | "payment" | "avit";
  label: string;
  colorClass: string; // tailwind text/border color class
}

// The order here is the order of the boxes on the event page (two per row).
export const CATEGORIES: CategoryDef[] = [
  { key: "internet", label: "Internet Code", colorClass: "border-honey-600 text-[#1B2A38]" },
  { key: "banquet", label: "Set-Up", colorClass: "border-petrol-900 text-[#1B2A38]" },
  { key: "am_break", label: "AM Coffee Break", colorClass: "border-petrol-900 text-[#1B2A38]" },
  { key: "pm_break", label: "PM Coffee Break", colorClass: "border-honey-600 text-[#1B2A38]" },
  { key: "lunch", label: "Lunch", colorClass: "border-honey-600 text-[#1B2A38]" },
  { key: "dinner", label: "Dinner", colorClass: "border-petrol-900 text-[#1B2A38]" },
  { key: "payment", label: "Payment & Charges", colorClass: "border-petrol-900 text-[#1B2A38]" },
  { key: "avit", label: "IT / AV", colorClass: "border-honey-600 text-[#1B2A38]" },
];

/** "14 / 17" (guaranteed / expected). Handles a missing number. */
export function guestsLabel(ev: Pick<BeoEvent, "guests" | "guests_expected">): string {
  const g = ev.guests;
  const e = ev.guests_expected;
  if (g == null && e == null) return "—";
  if (e == null) return String(g);
  if (g == null) return `— / ${e}`;
  return `${g} / ${e}`;
}