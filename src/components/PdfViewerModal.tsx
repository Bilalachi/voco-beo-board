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

  // Re-render current page whenever scale changes
  useEffect(() => {
    if (pdfRef.current) {
      renderPage(pageNum, scale);
    }
  }, [scale]);

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

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.6));
  const handleResetZoom = () => setScale(1.4);

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <>
              <button
                className="px-2.5 py-1 border rounded-md text-sm hover:bg-neutral-50 disabled:opacity-40"
                disabled={pageNum <= 1}
                onClick={() => renderPage(pageNum - 1)}
              >
                ‹ Prev
              </button>
              <span className="font-mono text-xs text-slate-600">
                Page {pageNum} / {numPages}
              </span>
              <button
                className="px-2.5 py-1 border rounded-md text-sm hover:bg-neutral-50 disabled:opacity-40"
                disabled={pageNum >= numPages}
                onClick={() => renderPage(pageNum + 1)}
              >
                Next ›
              </button>
            </>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            onClick={handleZoomOut}
            className="px-2 py-0.5 rounded text-sm hover:bg-white text-slate-700 transition shadow-sm font-bold"
            title="Zoom Out"
            disabled={scale <= 0.6}
          >
            –
          </button>
          <span className="font-mono text-xs font-medium min-w-[50px] text-center text-slate-600">
            {Math.round((scale / 1.4) * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="px-2 py-0.5 rounded text-sm hover:bg-white text-slate-700 transition shadow-sm font-bold"
            title="Zoom In"
            disabled={scale >= 3.0}
          >
            +
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs rounded hover:bg-white text-slate-500 hover:text-slate-700 border-l border-neutral-300 ml-1 transition"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Viewport Canvas Container */}
      <div className="bg-neutral-100 rounded-md p-3 text-center overflow-auto max-h-[75vh]">
        <canvas ref={canvasRef} className="shadow-lg bg-white mx-auto block" />
      </div>
    </Modal>
  );
}
