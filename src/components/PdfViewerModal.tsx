import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { loadPdf } from "../lib/pdfParse";

export default function PdfViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% (Your original default view)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
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
        renderPage(1, pdf);
      } catch (e: any) {
        setError("Couldn't load the original PDF.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function renderPage(n: number, pdf = pdfRef.current) {
    if (!pdf || !canvasRef.current) return;
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1.4 }); // Your exact original scale
    const canvas = canvasRef.current;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    setDimensions({ width: viewport.width, height: viewport.height });

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(n);
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 1.0));

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {/* Outer Scroll Container */}
      <div className="bg-neutral-100 rounded-md p-3 text-center overflow-auto max-h-[72vh] flex justify-center items-start">
        {/* Scaled Wrapper with explicitly calculated overflow bounds */}
        <div
          style={{
            width: dimensions ? dimensions.width * zoomLevel : "auto",
            height: dimensions ? dimensions.height * zoomLevel : "auto",
          }}
          className="flex justify-center items-start overflow-hidden transition-all duration-150 ease-out"
        >
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
              width: dimensions?.width,
              height: dimensions?.height,
            }}
          >
            <canvas ref={canvasRef} className="shadow-lg bg-white block" />
          </div>
        </div>
      </div>

      {/* Clean Bottom Controls Bar */}
      <div className="flex items-center justify-between pt-3">
        {/* Compact Zoom Controls */}
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md border text-xs">
          <button
            className="px-2 py-1 rounded hover:bg-white text-neutral-700 font-bold transition disabled:opacity-30"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1.0}
            title="Zoom Out"
          >
            –
          </button>
          <span className="font-mono text-[11px] text-neutral-500 min-w-[40px] text-center select-none">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            className="px-2 py-1 rounded hover:bg-white text-neutral-700 font-bold transition disabled:opacity-30"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            title="Zoom In"
          >
            +
          </button>
        </div>

        {/* Original Page Navigation */}
        {numPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              className="px-2.5 py-1 border rounded-md hover:bg-neutral-50 disabled:opacity-40"
              disabled={pageNum <= 1}
              onClick={() => renderPage(pageNum - 1)}
            >
              ‹ Prev
            </button>
            <span className="font-mono text-neutral-600">
              {pageNum} / {numPages}
            </span>
            <button
              className="px-2.5 py-1 border rounded-md hover:bg-neutral-50 disabled:opacity-40"
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
