export interface MealSection {
  time?: string;
  location?: string;
  item?: string;   // used by am_break / pm_break
  menu?: string;    // used by lunch / dinner
}

export interface AvitSection {
  details?: string;
}

export interface BanquetSection {
  setup?: string;
  notes?: string;
}

export interface BeoEvent {
  id: string;
  name: string;
  event_date: string;   // YYYY-MM-DD
  event_time: string;
  room: string;
  guests: number | null;
  internet_code: string;

  am_break: MealSection;
  pm_break: MealSection;
  lunch: MealSection;
  dinner: MealSection;
  avit: AvitSection;
  banquet: BanquetSection;

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
  | "updated_at"
  | "created_by_name"
  | "updated_by_name"
>;

export interface CategoryDef {
  key: "am_break" | "pm_break" | "lunch" | "dinner" | "avit" | "banquet";
  label: string;
  colorClass: string; // tailwind text/border color class
}

export const CATEGORIES: CategoryDef[] = [
  { key: "am_break", label: "AM Coffee Break", colorClass: "border-amber-500 text-amber-700" },
  { key: "pm_break", label: "PM Coffee Break", colorClass: "border-lime-600 text-lime-700" },
  { key: "lunch", label: "Lunch", colorClass: "border-orange-600 text-orange-700" },
  { key: "dinner", label: "Dinner", colorClass: "border-purple-600 text-purple-700" },
  { key: "avit", label: "IT / AV", colorClass: "border-petrol-500 text-petrol-600" },
  { key: "banquet", label: "Banquet Set-Up", colorClass: "border-rose-600 text-rose-700" },
];
