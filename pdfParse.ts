import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import type { BeoEventDraft } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function loadPdf(data: ArrayBuffer) {
  return pdfjsLib.getDocument({ data }).promise;
}

/** Reconstructs reading-order lines from a PDF page's raw text items. */
export async function pdfToLines(data: ArrayBuffer): Promise<{ lines: string[]; numPages: number }> {
  const pdf = await loadPdf(data);
  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows: Record<number, { x: number; s: string }[]> = {};
    content.items.forEach((raw) => {
      const it = raw as { transform: number[]; str: string };
      const y = Math.round(it.transform[5] / 2) * 2;
      (rows[y] ||= []).push({ x: it.transform[4], s: it.str });
    });
    const ys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    ys.forEach((y) => {
      const line = rows[y]
        .sort((a, b) => a.x - b.x)
        .map((t) => t.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) allLines.push(line);
    });
  }
  return { lines: allLines, numPages: pdf.numPages };
}

function findLine(lines: string[], re: RegExp): RegExpMatchArray | null {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m;
  }
  return null;
}

function toISODate(str: string): string {
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/**
 * Best-effort heuristic extraction. BEO layouts vary a lot between
 * properties, so this is intentionally generous with pattern matching —
 * the UI always shows an editable review form afterwards so staff can
 * correct anything the parser missed or misread.
 */
export function parseBeoLines(lines: string[]): Partial<BeoEventDraft> {
  const data: Partial<BeoEventDraft> = {};

  let m = findLine(lines, /(?:event|function|group)\s*name\s*:?\s*(.+)/i);
  data.name = m ? m[1].trim() : lines.find((l) => l.length > 4 && !/^page\s*\d/i.test(l)) || "";

  m = findLine(lines, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  if (!m) m = findLine(lines, /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i);
  data.event_date = m ? toISODate(m[1]) : "";

  m = findLine(lines, /\b(\d{1,2}(:\d{2})?\s*(am|pm)?\s*[-–to]{1,3}\s*\d{1,2}(:\d{2})?\s*(am|pm))\b/i);
  data.event_time = m ? m[1].replace(/\s+/g, " ").trim() : "";

  m = findLine(lines, /(?:function\s*room|meeting\s*room|room|venue|location)\s*:?\s*([A-Za-z0-9 &'-]{3,40})/i);
  data.room = m ? m[1].trim() : "";

  m = findLine(lines, /(?:guest count|guests?|pax|covers?|attendance|expected)\s*:?\s*(\d{1,5})/i);
  data.guests = m ? parseInt(m[1], 10) : null;

  const heads: { key: string; re: RegExp }[] = [
    { key: "am_break", re: /morning\s*break|am\s*break|breakfast\s*break|coffee\s*break\s*[-–:]?\s*am/i },
    { key: "pm_break", re: /afternoon\s*break|pm\s*break|coffee\s*break\s*[-–:]?\s*pm/i },
    { key: "lunch", re: /^lunch\b/i },
    { key: "dinner", re: /^dinner\b/i },
    { key: "avit", re: /audio\s*visual|a\/?v\s*requirement|it\s*requirement|equipment\s*list|technical\s*requirement/i },
    { key: "banquet", re: /room\s*set|set[- ]?up\s*style|banquet\s*set|floor\s*plan/i },
  ];
  const hits: { idx: number; key: string }[] = [];
  lines.forEach((l, idx) => {
    for (const h of heads) {
      if (h.re.test(l)) {
        hits.push({ idx, key: h.key });
        break;
      }
    }
  });
  const sections: Record<string, string> = {};
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].idx : Math.min(lines.length, h.idx + 10);
    const chunk = lines.slice(h.idx, end).join(" ").trim();
    if (!sections[h.key]) sections[h.key] = chunk;
  });

  data.am_break = { time: "", location: "", item: sections.am_break || "" };
  data.pm_break = { time: "", location: "", item: sections.pm_break || "" };
  data.lunch = { time: "", location: "", menu: sections.lunch || "" };
  data.dinner = { time: "", location: "", menu: sections.dinner || "" };
  data.avit = { details: sections.avit || "" };
  data.banquet = { setup: "", notes: sections.banquet || "" };
  data.internet_code = "";

  return data;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
