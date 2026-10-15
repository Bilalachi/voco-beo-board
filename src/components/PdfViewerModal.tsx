import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { loadPdf } from "../lib/pdfParse";

export default function PdfViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.4);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const pdf = await loadPdf(buf);
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        renderPage(1, scale, pdf);
      } catch (e: any) {
        setError("Couldn't load the original PDF.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function renderPage(n: number, currentScale = scale, pdf = pdfRef.current) {
    if (!pdf || !canvasRef.current) return;
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: currentScale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(n);
  }

  function handleZoom(delta: number) {
    const newScale = Math.min(Math.max(scale + delta, 0.8), 3.0);
    setScale(newScale);
    renderPage(pageNum, newScale);
  }

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-neutral-100 rounded-md p-3 text-center overflow-auto">
        <canvas ref={canvasRef} className="max-w-full shadow-lg bg-white mx-auto" />
      </div>
      <div className="flex items-center justify-between pt-3">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-neutral-50 font-semibold"
            onClick={() => handleZoom(-0.3)}
            title="Zoom Out"
          >
            – Zoom
          </button>
          <button
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-neutral-50 font-semibold"
            onClick={() => handleZoom(0.3)}
            title="Zoom In"
          >
            + Zoom
          </button>
        </div>

        {/* Page Navigation */}
        {numPages > 1 && (
          <div className="flex items-center gap-4">
            <button
              className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40"
              disabled={pageNum <= 1}
              onClick={() => renderPage(pageNum - 1)}
            >
              ‹ Prev
            </button>
            <span className="font-mono text-sm text-ink-soft">
              {pageNum} / {numPages}
            </span>
            <button
              className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40"
              disabled={pageNum >= numPages}
              onClick={() => renderPage(pageNum + 1)}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
