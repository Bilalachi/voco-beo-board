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
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.7));
  const handleResetZoom = () => setScale(1.4);

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error ? (
        <p className="text-red-600 text-sm p-4">{error}</p>
      ) : (
        <div className="relative bg-slate-900/5 rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[78vh]">
          {/* Floating Glassmorphism Toolbar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-slate-900/85 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-xl border border-white/10 text-xs select-none">
            {/* Page Navigation */}
            {numPages > 1 && (
              <div className="flex items-center gap-2 border-r border-white/20 pr-3">
                <button
                  className="hover:text-blue-400 transition disabled:opacity-30 disabled:hover:text-white"
                  disabled={pageNum <= 1}
                  onClick={() => renderPage(pageNum - 1)}
                >
                  ◀
                </button>
                <span className="font-mono text-[11px] text-slate-300">
                  {pageNum} / {numPages}
                </span>
                <button
                  className="hover:text-blue-400 transition disabled:opacity-30 disabled:hover:text-white"
                  disabled={pageNum >= numPages}
                  onClick={() => renderPage(pageNum + 1)}
                >
                  ▶
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.7}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 hover:text-white font-bold transition disabled:opacity-30"
                title="Zoom Out"
              >
                –
              </button>

              <button
                onClick={handleResetZoom}
                className="font-mono text-[11px] text-slate-300 hover:text-white transition px-1"
                title="Reset Zoom"
              >
                {Math.round((scale / 1.4) * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 hover:text-white font-bold transition disabled:opacity-30"
                title="Zoom In"
              >
                +
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
            <canvas
              ref={canvasRef}
              className="shadow-2xl bg-white rounded-sm transition-all duration-150 ease-out my-auto"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
