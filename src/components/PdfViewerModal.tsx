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
        renderPage(1, 1.4, pdf);
      } catch (e: any) {
        setError("Couldn't load the original PDF.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function renderPage(n: number, currentScale: number, pdf = pdfRef.current) {
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
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      
      {/* Scrollable Container (allows zooming past container width without squeezing) */}
      <div className="bg-neutral-100 rounded-md p-3 text-center overflow-auto max-h-[70vh]">
        <canvas ref={canvasRef} className="shadow-lg bg-white mx-auto block" />
      </div>

      {/* Clean Bottom Controls Bar */}
      <div className="flex items-center justify-between pt-3">
        {/* Compact Zoom Controls */}
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md border text-xs">
          <button
            className="px-2 py-1 rounded hover:bg-white text-neutral-700 font-bold transition disabled:opacity-30"
            onClick={() => handleZoom(-0.3)}
            disabled={scale <= 0.8}
            title="Zoom Out"
          >
            –
          </button>
          <span className="font-mono text-[11px] text-neutral-500 min-w-[36px] text-center select-none">
            {Math.round((scale / 1.4) * 100)}%
          </span>
          <button
            className="px-2 py-1 rounded hover:bg-white text-neutral-700 font-bold transition disabled:opacity-30"
            onClick={() => handleZoom(0.3)}
            disabled={scale >= 3.0}
            title="Zoom In"
          >
            +
          </button>
        </div>

        {/* Compact Page Navigation */}
        {numPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              className="px-2.5 py-1 border rounded-md hover:bg-neutral-50 disabled:opacity-40"
              disabled={pageNum <= 1}
              onClick={() => renderPage(pageNum - 1, scale)}
            >
              ‹ Prev
            </button>
            <span className="font-mono text-neutral-600">
              {pageNum} / {numPages}
            </span>
            <button
              className="px-2.5 py-1 border rounded-md hover:bg-neutral-50 disabled:opacity-40"
              disabled={pageNum >= numPages}
              onClick={() => renderPage(pageNum + 1, scale)}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
