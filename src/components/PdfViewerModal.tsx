import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { loadPdf } from "../lib/pdfParse";

export default function PdfViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.4); // Your original default scale
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

  async function renderPage(n: number, scale = zoomScale, pdf = pdfRef.current) {
    if (!pdf || !canvasRef.current) return;
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(n);
  }

  function handleZoom(newScale: number) {
    setZoomScale(newScale);
    renderPage(pageNum, newScale);
  }

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      
      {/* Exact Original Canvas Container */}
      <div className="bg-neutral-100 rounded-md p-3 text-center overflow-auto">
        <canvas
          ref={canvasRef}
          className={`${
            zoomScale === 1.4 ? "max-w-full" : ""
          } shadow-lg bg-white mx-auto block`}
        />
      </div>

      {/* Clean Bottom Bar with Zoom & Page Nav */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-1.5 border rounded-md px-2 py-1 text-xs bg-white">
          <button
            className="px-1.5 py-0.5 rounded hover:bg-neutral-100 font-bold disabled:opacity-30"
            disabled={zoomScale <= 1.4}
            onClick={() => handleZoom(Math.max(1.4, zoomScale - 0.4))}
          >
            –
          </button>
          <span className="font-mono text-neutral-600 min-w-[36px] text-center">
            {Math.round((zoomScale / 1.4) * 100)}%
          </span>
          <button
            className="px-1.5 py-0.5 rounded hover:bg-neutral-100 font-bold disabled:opacity-30"
            disabled={zoomScale >= 3.0}
            onClick={() => handleZoom(zoomScale + 0.4)}
          >
            +
          </button>
        </div>

        {numPages > 1 && (
          <div className="flex items-center justify-center gap-4">
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
