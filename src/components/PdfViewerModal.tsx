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

  // Touch pinch state
  const [zoomScale, setZoomScale] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("center top");
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

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
  }

  // Handle pinch gesture start
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && containerRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Distance between fingers
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = zoomScale;

      // Calculate midpoint between fingers relative to the container
      const rect = containerRef.current.getBoundingClientRect();
      const midX = (touch1.clientX + touch2.clientX) / 2 - rect.left + containerRef.current.scrollLeft;
      const midY = (touch1.clientY + touch2.clientY) / 2 - rect.top + containerRef.current.scrollTop;

      setTransformOrigin(`${midX}px${midY}px`);
    }
  };

  // Handle pinch move
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 3.5);
      setZoomScale(newScale);
    }
  };

  // Reset pinch reference
  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  const isZoomed = zoomScale > 1.01;

  return (
    <Modal title="Original BEO" onClose={onClose} wide>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      
      {/* Container with Focal-Point Touch Zoom */}
      <div
        ref={containerRef}
        className="bg-neutral-100 rounded-md p-3 text-center overflow-auto touch-pan-x touch-pan-y max-h-[72vh]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="inline-block"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: isZoomed ? transformOrigin : "center top",
            transition: initialPinchDistRef.current ? "none" : "transform 0.15s ease-out",
          }}
        >
          <canvas
            ref={canvasRef}
            className={`${
              isZoomed ? "" : "max-w-full"
            } shadow-lg
