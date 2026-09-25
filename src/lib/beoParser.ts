/**
 * BEO parser: turns the text items of a Voco BEO PDF into structured data.
 * Pure function, no browser or PDF library needed, so it can be tested in Node.
 */

export interface TextItem {
  str: string;
  x: number; // left edge
  y: number; // baseline (PDF coordinates, larger = higher on the page)
  width: number;
}

export interface CateringBlock {
  eventId: string | null;
  room: string;
  start: string | null; // "HH:MM"
  end: string | null;
  name: string; // e.g. "Morning Coffee Break", "Set Menu"
  priceText: string | null; // e.g. "$7.77 Per Person"
  price: number | null;
  expected: number | null;
  guaranteed: number | null;
  menu: string[][]; // groups of items, split on the "*******" separators
}

export interface BeverageService {
  room: string | null;
  name: string;
  priceText: string | null;
  price: number | null;
  start: string | null;
  end: string | null;
  expected: number | null;
  guaranteed: number | null;
  items: string[];
}

export interface BeoFunction {
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string;
  room: string;
  function: string;
  setup: string;
  expected: number | null;
  guaranteed: number | null;
  rental: string;
  postAs: string | null;
  catering: CateringBlock[];
  beverages: BeverageService[];
}

export interface BeoDay {
  date: string;
  dayName: string;
  functions: BeoFunction[];
  unmatchedCatering: CateringBlock[];
  unmatchedBeverages: BeverageService[];
}

export interface NoteGroup {
  heading: string | null; // "Catering Notes", "General Notes"
  dept: string | null; // "BQT", "IT & AV", ...
  lines: string[];
}

export interface BeoDocument {
  account: string;
  contactName: string;
  address: string;
  telephone: string;
  fax: string;
  contractNumber: string;
  cateringManager: string;
  salesManager: string;
  bookingName: string;
  onSiteContact: string;
  days: BeoDay[];
  notes: NoteGroup[];
  minimum: number | null;
  maximum: number | null;
  billing: string[];
  revenuePerDay: { date: string; total: number }[];
  revenueTotal: number | null;
  printedOn: string | null; // YYYY-MM-DD
  warnings: string[];
}

/* ---------------------------------------------------------------- lines */

interface Cell { x: number; w: number; text: string }
interface Line { y: number; cells: Cell[]; text: string; page?: number; centered?: boolean }

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const DATE_TITLE =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/i;

const SECTION_TITLES = new Set([
  'food', 'beverage service', 'billing instruction', 'revenue summary',
  'audio visual', 'room rental', 'equipment', 'miscellaneous', 'setup',
  'set-up', 'décor', 'decor', 'staffing', 'labor', 'labour',
]);

function buildLines(items: TextItem[]): Line[] {
  const real = items
    .map((i) => ({ ...i, str: i.str.trim() }))
    .filter((i) => i.str !== '');
  real.sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: typeof real[] = [];
  for (const it of real) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[g.length - 1].y - it.y) <= 3) g.push(it);
    else groups.push([it]);
  }
  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    let text = '';
    let prevEnd = -Infinity;
    for (const it of g) {
      text += (text && it.x - prevEnd > 1.5 ? ' ' : '') + it.str;
      prevEnd = it.x + it.width;
    }
    return {
      y: g[0].y,
      cells: g.map((i) => ({ x: i.x, w: i.width, text: i.str })),
      text: text.replace(/\s+/g, ' ').trim(),
    };
  });
}

function pad(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t;
}

function isoFromTitle(m: RegExpMatchArray): string {
  const yy = m[4].length === 2 ? `20${m[4]}` : m[4];
  return `${yy}-${MONTHS[m[3].toUpperCase()] ?? '01'}-${m[2].padStart(2, '0')}`;
}

function isoFromDMY(s: string): string {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : s;
}

const num = (s: string) => parseFloat(s.replace(/,/g, ''));

/* ---------------------------------------------------------------- main */

export function parseBeoPages(pages: TextItem[][], pageWidth = 612): BeoDocument {
  const warnings: string[] = [];
  const doc: BeoDocument = {
    account: '', contactName: '', address: '', telephone: '', fax: '',
    contractNumber: '', cateringManager: '', salesManager: '', bookingName: '',
    onSiteContact: '', days: [], notes: [], minimum: null, maximum: null,
    billing: [], revenuePerDay: [], revenueTotal: null, printedOn: null,
    warnings,
  };

  const dayBodies = new Map<string, { dayName: string; lines: Line[] }>();
  let headerLines: Line[] | null = null;
  let currentDate: string | null = null;

  for (const [pageNo, items] of pages.entries()) {
    const built = buildLines(items);
    const center = pageWidth / 2;
    const lines = built.map((l) => ({
      ...l,
      page: pageNo,
      centered: l.cells.length === 1 && Math.abs(l.cells[0].x + l.cells[0].w / 2 - center) < 30,
    }));
    const titleIdx = lines.findIndex((l) => DATE_TITLE.test(l.text));
    let body: Line[];
    if (titleIdx >= 0) {
      const m = lines[titleIdx].text.match(DATE_TITLE)!;
      currentDate = isoFromTitle(m);
      if (!headerLines) headerLines = lines.slice(0, titleIdx);
      if (!dayBodies.has(currentDate)) {
        dayBodies.set(currentDate, { dayName: m[1], lines: [] });
      }
      body = lines.slice(titleIdx + 1);
    } else {
      const firstTitle = lines.findIndex((l) => l.centered && SECTION_TITLES.has(l.text.toLowerCase()));
      if (firstTitle >= 0) {
        body = lines.slice(firstTitle);
      } else {
        warnings.push('A page had no date heading and no recognizable section; attached to the previous day as-is.');
        body = lines;
      }
    }
    body = body.filter(
      (l) =>
        l.y >= 75 &&
        !/^Page\s*\d+\s*of\s*\d+$/i.test(l.text) &&
        l.text !== 'Customer Initials',
    );
    if (currentDate) dayBodies.get(currentDate)!.lines.push(...body);
  }

  if (!dayBodies.size) {
    warnings.push('No date headings found. Is this a BEO PDF with a text layer?');
    return doc;
  }

  if (headerLines) parseHeader(headerLines, doc);

  const allRooms = new Set<string>();
  for (const [date, { dayName, lines }] of dayBodies) {
    const day = parseDay(date, dayName, lines, doc, warnings);
    day.functions.forEach((f) => allRooms.add(f.room));
    doc.days.push(day);
  }

  for (const day of doc.days) {
    for (const b of [...day.unmatchedBeverages, ...day.functions.flatMap((f) => f.beverages)]) {
      resolveBeverageRoom(b, allRooms);
    }
  }

  for (const day of doc.days) {
    const keep: BeverageService[] = [];
    for (const b of day.unmatchedBeverages) {
      const fn = pickFunction(day.functions, b.room, b.start, b.end);
      if (fn) fn.beverages.push(b);
      else keep.push(b);
    }
    day.unmatchedBeverages = keep;
  }

  if (!doc.account) warnings.push('Could not read the account name.');
  if (!doc.days.some((d) => d.functions.length)) warnings.push('No schedule rows found.');
  return doc;
}

/* -------------------------------------------------------------- header */

const HEADER_KEYS: Record<string, keyof BeoDocument> = {
  'account name': 'account', 'contact name': 'contactName', address: 'address',
  telephone: 'telephone', fax: 'fax', 'contract number': 'contractNumber',
  'catering mgr': 'cateringManager', 'sales manager': 'salesManager',
  'booking name': 'bookingName', 'on site contact': 'onSiteContact',
};

function parseHeader(lines: Line[], doc: BeoDocument) {
  const values: Record<string, string> = {};
  const lastLabel: Record<'L' | 'R', string | null> = { L: null, R: null };
  for (const line of lines) {
    for (const side of ['L', 'R'] as const) {
      const cells = line.cells.filter((c) => (side === 'L' ? c.x < 280 : c.x >= 280));
      if (!cells.length) continue;
      let label: string | null = null;
      let sawLabel = false;
      for (const c of cells) {
        if (c.text.endsWith(':')) {
          label = c.text.slice(0, -1).trim().toLowerCase();
          sawLabel = true;
          values[label] ??= '';
          lastLabel[side] = label;
        } else if (label) {
          values[label] = (values[label] + ' ' + c.text).trim();
        }
      }
      if (!sawLabel && lastLabel[side]) {
        const k = lastLabel[side]!;
        values[k] = (values[k] + ' ' + cells.map((c) => c.text).join(' ')).trim();
      }
    }
  }
  for (const [k, v] of Object.entries(values)) {
    const key = HEADER_KEYS[k];
    if (key) (doc[key] as string) = v.replace(/[,\s]+$/, '');
  }
}

/* ----------------------------------------------------------------- day */

function pickFunction(fns: BeoFunction[], room: string | null, start: string | null, end: string | null) {
  if (!start) return undefined;
  const sameRoom = fns.filter((f) => f.room === room);
  return (
    sameRoom.find((f) => f.start === start && f.end === end) ??
    sameRoom
      .filter((f) => start >= f.start && start < f.end)
      .sort((a, b) => toMin(a.end) - toMin(a.start) - (toMin(b.end) - toMin(b.start)))[0]
  );
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface Section { name: string; lines: Line[] }

function parseDay(
  date: string,
  dayName: string,
  lines: Line[],
  doc: BeoDocument,
  warnings: string[],
): BeoDay {
  const day: BeoDay = {
    date, dayName, functions: [], unmatchedCatering: [], unmatchedBeverages: [],
  };

  const sections: Section[] = [{ name: 'schedule', lines: [] }];
  let lastPage = lines[0]?.page;
  const isNotesLabel = (l: Line) =>
    l.cells[0].x < 100 && /^(Catering|General) Notes$/i.test(l.cells[0].text);
  for (const l of lines) {
    if (l.page !== lastPage) {
      sections.push({ name: 'untitled', lines: [] });
      lastPage = l.page;
    }
    const only = l.centered ? l.text.toLowerCase() : '';
    if (only && SECTION_TITLES.has(only)) {
      const cur = sections[sections.length - 1];
      if (cur.name === 'untitled' && !cur.lines.length) cur.name = only;
      else if (cur.name !== only) sections.push({ name: only, lines: [] });
      continue;
    }
    let cur = sections[sections.length - 1];
    if (isNotesLabel(l) && cur.name !== 'notes') {
      if (cur.name === 'untitled') cur.name = 'notes';
      else { cur = { name: 'notes', lines: [] }; sections.push(cur); }
    }
    cur.lines.push(l);
  }
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].name === 'untitled') sections[i].name = sections[i - 1].name;
  }
  const linesOf = (name: string) => sections.filter((s) => s.name === name).flatMap((s) => s.lines);

  const cateringBlocks = parseFood(linesOf('food'));
  const beverages = parseBeverages(linesOf('beverage service'));
  const notesLines = linesOf('notes');
  const otherLines = linesOf('revenue summary');
  parseSchedule(linesOf('schedule'), day, date, warnings);
  for (const l of linesOf('billing instruction')) doc.billing.push(l.text);
  const schedule = sections[0];

  for (const b of cateringBlocks) {
    const fn = pickFunction(day.functions, b.room, b.start, b.end);
    if (fn) fn.catering.push(b);
    else day.unmatchedCatering.push(b);
  }
  day.unmatchedBeverages.push(...beverages);

  if (notesLines.length) parseNotes(notesLines, doc);
  parseRevenueAndMisc([...otherLines, ...notesLines, ...schedule.lines], doc);
  return day;
}

function parseSchedule(lines: Line[], day: BeoDay, date: string, warnings: string[]) {
  const headerIdx = lines.findIndex(
    (l) => l.cells[0]?.text === 'Time' && l.cells.some((c) => c.text === 'Function'),
  );
  if (headerIdx < 0) return;
  const head = lines[headerIdx].cells;
  const names = ['time', 'room', 'function', 'setup', 'exp', 'rental'] as const;
  const xs = names.map((n, i) => {
    const want = { time: 'Time', room: 'Room', function: 'Function', setup: 'Set-up', exp: 'Exp/Gtd', rental: 'Rental' }[n];
    return head.find((c) => c.text === want)?.x ?? (i === 0 ? 0 : Infinity);
  });
  const colOf = (x: number) => {
    let c = 0;
    for (let i = 0; i < xs.length; i++) if (x >= xs[i] - 8) c = i;
    return c;
  };

  type Row = { cols: Record<(typeof names)[number], string>; postAs: string | null };
  const rows: Row[] = [];
  for (const l of lines.slice(headerIdx + 1)) {
    if (/^Post As\b/i.test(l.text)) {
      if (rows.length) rows[rows.length - 1].postAs = l.text.replace(/^Post As\s*/i, '');
      continue;
    }
    const timeCell = l.cells.find((c) => colOf(c.x) === 0 && /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(c.text));
    let row: Row;
    if (timeCell) {
      row = { cols: { time: '', room: '', function: '', setup: '', exp: '', rental: '' }, postAs: null };
      rows.push(row);
    } else if (rows.length) {
      row = rows[rows.length - 1];
    } else continue;
    for (const c of l.cells) {
      const k = names[colOf(c.x)];
      row.cols[k] = (row.cols[k] + ' ' + c.text).trim();
    }
  }

  for (const r of rows) {
    const t = r.cols.time.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!t) { warnings.push(`Unreadable time "${r.cols.time}" on ${date}`); continue; }
    const e = r.cols.exp.match(/(\d+)\s*\/\s*(\d+)/);
    day.functions.push({
      date,
      start: pad(t[1]),
      end: pad(t[2]),
      room: r.cols.room,
      function: r.cols.function,
      setup: r.cols.setup,
      expected: e ? +e[1] : null,
      guaranteed: e ? +e[2] : null,
      rental: r.cols.rental,
      postAs: r.postAs,
      catering: [],
      beverages: [],
    });
  }
}

function parseFood(lines: Line[]): CateringBlock[] {
  const starts: number[] = [];
  lines.forEach((l, i) => { if (/^Event ID\s*-\s*\S+/i.test(l.text)) starts.push(i - 1); });
  const blocks: CateringBlock[] = [];

  starts.forEach((s, bi) => {
    const end = bi + 1 < starts.length ? starts[bi + 1] : lines.length;
    const seg = lines.slice(Math.max(s, 0), end);

    // Find where Event ID is located in this segment
    const eventIdIdx = seg.findIndex((l) => /^Event ID\s*-\s*\S+/i.test(l.text));
    
    // The line immediately above Event ID is always the Room Name (e.g. "Atrio")
    const roomLineIdx = eventIdIdx > 0 ? eventIdIdx - 1 : 0;
    const roomName = seg[roomLineIdx]?.text || '';

    const b: CateringBlock = {
      eventId: null,
      room: roomName,
      start: null,
      end: null,
      name: '',
      priceText: null,
      price: null,
      expected: null,
      guaranteed: null,
      menu: [],
    };

    let i = eventIdIdx >= 0 ? eventIdIdx : 1;
    for (; i < seg.length; i++) {
      const t = seg[i].text;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^Event ID\s*-\s*(\S+)/i))) b.eventId = m[1];
      else if ((m = t.match(/^(\d{1,2}:\d{2})\s+To\s+(\d{1,2}:\d{2})$/i))) { b.start = pad(m[1]); b.end = pad(m[2]); }
      else if ((m = t.match(/^\$\s*([\d,]+(?:\.\d+)?)/))) { b.priceText = t; b.price = num(m[1]); }
      else if ((m = t.match(/^Exp\s+(\d+)\s*\/\s*Gtd\s+(\d+)/i))) { b.expected = +m[1]; b.guaranteed = +m[2]; i++; break; }
      else b.name = (b.name + ' ' + t).trim();
    }

    let group: string[] = [];
    for (; i < seg.length; i++) {
      const t = seg[i].text;
      if (/^\*+$/.test(t)) { if (group.length) b.menu.push(group); group = []; }
      else group.push(t);
    }
    if (group.length) b.menu.push(group);

    // Clean up title if stray room names or top margin text remained in b.name
    if (b.name) {
      b.name = b.name.replace(new RegExp(`^${b.room}\\s*`, 'i'), '').trim();
    }

    blocks.push(b);
  });

  return blocks;
}

function parseBeverages(lines: Line[]): BeverageService[] {
  const out: BeverageService[] = [];
  let cur: BeverageService | null = null;
  for (const l of lines) {
    let m: RegExpMatchArray | null;
    if ((m = l.text.match(/^(.*?)\s+(\$\s*([\d,]+(?:\.\d+)?)\s+Per Person)\s+(\d{1,2}:\d{2})\s+To\s+(\d{1,2}:\d{2})$/i))) {
      cur = { room: null, name: m[1], priceText: m[2], price: num(m[3]), start: pad(m[4]), end: pad(m[5]), expected: null, guaranteed: null, items: [] };
      out.push(cur);
    } else if (cur && (m = l.text.match(/^Exp\s+(\d+)\s*\/\s*Gtd\s+(\d+)/i))) {
      cur.expected = +m[1]; cur.guaranteed = +m[2];
    } else if (cur) cur.items.push(l.text);
  }
  return out;
}

function resolveBeverageRoom(b: BeverageService, rooms: Set<string>) {
  if (b.room) return;
  const room = [...rooms].sort((a, c) => c.length - a.length).find((r) => b.name.startsWith(r + ' '));
  if (room) { b.room = room; b.name = b.name.slice(room.length).trim(); }
}

function parseNotes(lines: Line[], doc: BeoDocument) {
  let pendingHeading: string | null = null;
  let cur: NoteGroup | null = null;
  const orphans: string[] = [];
  const groups: NoteGroup[] = [];
  for (const l of lines) {
    const left = l.cells.filter((c) => c.x < 100);
    const right = l.cells.filter((c) => c.x >= 100).map((c) => c.text).join(' ');
    for (const c of left) {
      if (/^(Catering|General) Notes$/i.test(c.text)) pendingHeading = c.text;
      else {
        cur = { heading: pendingHeading, dept: c.text, lines: cur ? [] : [...orphans] };
        groups.push(cur);
      }
    }
    if (right) (cur ? cur.lines : orphans).push(right);
  }
  if (!groups.length && orphans.length) groups.push({ heading: pendingHeading, dept: null, lines: orphans });
  doc.notes.push(...groups);
  for (const g of groups) {
    for (const t of g.lines) {
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^Minimum:\s*(\d+)/i))) doc.minimum = +m[1];
      if ((m = t.match(/^Maximum:\s*(\d+)/i))) doc.maximum = +m[1];
    }
  }
}

function parseRevenueAndMisc(lines: Line[], doc: BeoDocument) {
  for (const l of lines) {
    let m: RegExpMatchArray | null;
    if ((m = l.text.match(/^(\d{2}-\d{2}-\d{2})\s+Total per Day\s+([\d,]+\.\d{2})$/i))) {
      const date = isoFromDMY(m[1]);
      if (!doc.revenuePerDay.some((r) => r.date === date)) doc.revenuePerDay.push({ date, total: num(m[2]) });
    } else if ((m = l.text.match(/^Total\s+([\d,]+\.\d{2})$/i))) doc.revenueTotal = num(m[1]);
    else if ((m = l.text.match(/Date Last Printed:\s*(\d{2}-\d{2}-\d{2})/i))) doc.printedOn = isoFromDMY(m[1]);
  }
}

/* -------------------------------------------------- board-friendly drafts */

export interface BreakDraft {
  time: string; // food time
  location: string;
  item: string; // food items
  drinks_time: string; // coffee & tea time
  drinks: string; // coffee & tea items or explicit label
}

export interface DayDraft {
  contract_number: string;
  name: string;
  event_date: string;
  event_time: string;
  room: string;
  guests: number | null;
  guests_expected: number | null;
  am_break: BreakDraft;
  pm_break: BreakDraft;
  lunch: { time: string; location: string; menu: string };
  dinner: { time: string; location: string; menu: string };
  avit: { details: string };
  banquet: { setup: string; notes: string };
  payment: { charges: string; method: string; notes: string };
}

function fmt12(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  const h = +m[1];
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}
const range12 = (f: BeoFunction) => `${fmt12(f.start)} \u2013 ${fmt12(f.end)}`;
const hasPrice = (t: string) => /(USD|\$)\s*\d|\d\s*(USD|\$)/i.test(t);

type Kind = 'am' | 'pm' | 'continuous' | 'welcome_drinks' | 'lunch' | 'dinner' | 'other';

function classify(f: BeoFunction): Kind {
  const n = f.function.toLowerCase();
  
  if (/lunch/.test(n)) return 'lunch';
  if (/dinner|gala/.test(n)) return 'dinner';
  
  if (/cocktail|reception/.test(n)) {
    return toMin(f.start) >= 16 * 60 ? 'dinner' : 'lunch';
  }
  
  if (/welcome\s*coffee|welcome\s*tea|welcome\s*drink/.test(n)) return 'welcome_drinks';
  if (/continuous\s*coffee|continuous\s*tea|continuous/.test(n)) return 'continuous';
  
  if (/\bbreak\b|coffee|refreshment/.test(n)) {
    if (/morning|\bam\b/.test(n)) return 'am';
    if (/afternoon|\bpm\b/.test(n)) return 'pm';
    return f.start < '12:00' ? 'am' : 'pm';
  }
  
  return 'other';
}

const DRINK = /coffee|nescaf|\btea\b|milk|juice|water|espresso|cappuccino|latte|soft drink|soda/i;
const isDrinkGroup = (g: string[]) => g.length > 0 && g.filter((i) => DRINK.test(i)).length / g.length >= 0.6;

function splitBreak(f: BeoFunction): { drinks: string; food: string } {
  const groups = f.catering.flatMap((b) => b.menu);
  let drinks: string[][] = [];
  let food: string[][] = groups;
  if (groups.length >= 2 && isDrinkGroup(groups[0])) {
    drinks = [groups[0]];
    food = groups.slice(1);
  } else if (groups.length === 1 && isDrinkGroup(groups[0])) {
    drinks = groups;
    food = [];
  }
  const text = (gs: string[][]) => gs.map((g) => g.join('\n')).join('\n');
  return { drinks: text(drinks), food: text(food) };
}

function menuText(f: BeoFunction): string {
  const parts: { name: string; body: string }[] = f.catering.map((b) => ({
    name: b.name,
    body: b.menu.map((g) => g.join('\n')).join('\n\n'),
  }));

  for (const b of f.beverages) {
    if (!parts.some((p) => p.name.toLowerCase() === b.name.toLowerCase())) {
      parts.push({ name: b.name, body: b.items.join('\n') });
    }
  }

  if (parts.length <= 1) return parts[0]?.body ?? '';
  return parts.map((p) => `${p.name}:\n${p.body}`).join('\n\n');
}

function extractPayment(doc: BeoDocument) {
  const all = [...doc.billing, ...doc.notes.flatMap((g) => g.lines)];
  const charges: string[] = [];
  const notes: string[] = [];
  let method = '';
  for (const raw of doc.billing) {
    const m = raw.match(/^(.*?)\s*\bPayment\b:?\s*(.*)$/i);
    if (m) {
      if (m[1].trim()) notes.push(m[1].trim());
      if (!method) method = m[2].trim();
    } else if (!/^-?\s*(Charges|Food|Bev(erage)?)\s*:/i.test(raw)) notes.push(raw.trim());
  }
  for (const raw of all) {
    if (/^-?\s*(Charges|Food|Bev(erage)?)\s*:.*(USD|\$)/i.test(raw)) {
      const line = raw.replace(/^-\s*/, '').trim();
      if (!charges.includes(line)) charges.push(line);
    }
  }
  return { charges: charges.join('\n'), method, notes: notes.filter(Boolean).join('\n') };
}

/** Converts BEO days into drafts, emitting a separate draft for each primary meeting room booking. */
export function beoToDrafts(doc: BeoDocument): DayDraft[] {
  const avLines: string[] = [];
  const bqLines: string[] = [];
  for (const g of doc.notes) {
    const lines = g.lines.filter((l) => !hasPrice(l));
    if (g.dept && /\b(av|it|audio|tech\w*)\b/i.test(g.dept)) avLines.push(...lines);
    else if (g.dept && !/bqt|banquet|catering/i.test(g.dept)) bqLines.push(...lines.map((l, i) => (i === 0 ? `[${g.dept}] ${l}` : l)));
    else bqLines.push(...lines);
  }
  const payment = extractPayment(doc);
  const emptyBreak = (): BreakDraft => ({ time: '', location: '', item: '', drinks_time: '', drinks: '' });

  const drafts: DayDraft[] = [];

  for (const day of doc.days) {
    if (!day.functions.length) continue;

    const fns = day.functions;
    const classified = fns.map((f) => ({ fn: f, kind: classify(f) }));

    const primaryFns = classified
      .filter((c) => c.kind === 'other')
      .map((c) => c.fn);

    const mainEvents = primaryFns.length > 0 ? primaryFns : fns;
    const continuous = fns.find((f) => classify(f) === 'continuous');
    const welcomeDrinks = fns.find((f) => classify(f) === 'welcome_drinks');

    for (const mainFn of mainEvents) {
      const draft: DayDraft = {
        contract_number: doc.contractNumber,
        name: doc.bookingName || doc.account,
        event_date: day.date,
        event_time: range12(mainFn),
        room: mainFn.room,
        guests: mainFn.guaranteed,
        guests_expected: mainFn.expected,
        am_break: emptyBreak(),
        pm_break: emptyBreak(),
        lunch: { time: '', location: '', menu: '' },
        dinner: { time: '', location: '', menu: '' },
        avit: { details: avLines.join('\n') },
        banquet: { setup: mainFn.setup, notes: '' },
        payment,
      };

      const also: string[] = [];
      const taken = new Set<string>();

      for (const { fn: f, kind } of classified) {
        if (mainEvents.includes(f) || f === continuous || f === welcomeDrinks) continue;

        if (kind === 'other' || taken.has(kind)) {
          also.push(`Also: ${range12(f)} ${f.room} \u2013 ${f.function}`);
          continue;
        }

        taken.add(kind);
        const base = { time: range12(f), location: f.room };

        if (kind === 'am' || kind === 'pm') {
          const { drinks, food } = splitBreak(f);
          
          let drinksTime = drinks ? range12(f) : '';
          let drinksContent = drinks;

          if (continuous) {
            drinksTime = range12(continuous);
            drinksContent = "Continuous Coffee and Tea";
          } else if (kind === 'am' && welcomeDrinks) {
            drinksTime = range12(welcomeDrinks);
            const welcomeText = menuText(welcomeDrinks);
            drinksContent = welcomeText ? `Welcome Coffee and Tea:\n${welcomeText}` : "Welcome Coffee and Tea";
          }

          const b: BreakDraft = {
            ...base,
            item: food,
            drinks: drinksContent,
            drinks_time: drinksTime,
          };
          if (kind === 'am') draft.am_break = b;
          else draft.pm_break = b;
        } else if (kind === 'lunch') {
          draft.lunch = { ...base, menu: menuText(f) };
        } else if (kind === 'dinner') {
          draft.dinner = { ...base, menu: menuText(f) };
        }
      }

      if (welcomeDrinks && !draft.am_break.drinks_time) {
        const welcomeText = menuText(welcomeDrinks);
        draft.am_break.drinks_time = range12(welcomeDrinks);
        draft.am_break.drinks = welcomeText ? `Welcome Coffee and Tea:\n${welcomeText}` : "Welcome Coffee and Tea";
        if (!draft.am_break.location) draft.am_break.location = welcomeDrinks.room;
      } else if (continuous && !draft.am_break.drinks_time && !draft.pm_break.drinks_time) {
        draft.am_break = {
          ...emptyBreak(),
          location: continuous.room,
          drinks_time: range12(continuous),
          drinks: "Continuous Coffee and Tea",
        };
      }

      const ownMenu = menuText(mainFn);
      if (ownMenu) {
        const mealKind: 'lunch' | 'dinner' = toMin(mainFn.start) >= 16 * 60 ? 'dinner' : 'lunch';
        if (!taken.has(mealKind)) {
          const meal = { time: range12(mainFn), location: mainFn.room, menu: ownMenu };
          if (mealKind === 'dinner') draft.dinner = meal;
          else draft.lunch = meal;
        } else {
          also.push(`Also: ${range12(mainFn)} ${mainFn.room} \u2013 ${mainFn.function} menu (see original PDF)`);
        }
      }

      draft.banquet.notes = [...bqLines, ...also].join('\n');
      drafts.push(draft);
    }
  }

  return drafts;
}
