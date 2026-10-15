import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { loadPdf } from "../lib/pdfParse";

export default function PdfViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Touch tracking refs
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    x: number;
    y: number;
    center: { x: number; y: number };
  } | null>(null);

  const panRef = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

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
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPageNum(n);
    resetZoom();
  }

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  // Touch Start (Handles both 2-finger pinch and 1-finger drag/pan)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && containerRef.current) {
      // 2 Fingers: Pinch Zoom
      panRef.current = null;
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      pinchRef.current = {
        dist,
        scale,
        x: position.x,
        y: position.y,
        center,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // 1 Finger: Pan/Move while zoomed in
      pinchRef.current = null;
      const touch = e.touches[0];
      panRef.current = {
        x: position.x,
        y: position.y,
        startX: touch.clientX,
        startY: touch.clientY,
      };
    }
  };

  // Touch Move
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      // Pinching
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / pinchRef.current.dist;
      const newScale = Math.min(Math.max(pinchRef.current.scale * factor, 1), 3.5);

      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      } else {
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        const dx = center.x - pinchRef.current.center.x;
        const dy = center.y - pinchRef.current.center.y;

        setPosition({
          x: pinchRef.current.x + dx,
          y: pinchRef.current.y + dy,
        });
      }

      setScale(newScale);
    } else if (e.touches.length === 1 && panRef.current && scale > 1) {
      // Single Finger Drag/Pan
      const touch = e.touches[0];
      const dx = touch.clientX - panRef.current.startX;
      const dy = touch.clientY - panRef.current.startY;

      setPosition({
        x: panRef.current.x + dx,
        y: panRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    panRef.current = null;
  };

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {/* Main Touch Viewport */}
      <div
        ref={containerRef}
        className="bg-neutral-100 rounded-md p-3 text-center overflow-hidden max-h-[72vh] flex justify-center items-start select-none"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transformOrigin: "center top",
            transition: pinchRef.current || panRef.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          <canvas ref={canvasRef} className="max-w-full shadow-lg bg-white mx-auto block" />
        </div>
      </div>

      {/* Original Page Navigation */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-3">
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
    </Modal>
  );
}