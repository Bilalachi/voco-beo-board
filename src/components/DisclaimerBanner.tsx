import { useState, useEffect } from "react";

export default function DisclaimerBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("hasSeenDisclaimer");
    if (hasSeen) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("hasSeenDisclaimer", "true");
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-300 shadow-sm relative z-50">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-start justify-between gap-3">
        <div className="flex gap-2.5 items-center">
          <span className="text-base leading-none">⚠️</span>
          <p className="text-xs text-amber-950 font-medium leading-snug">
            <strong className="font-semibold">Notice:</strong> This PWA relies on AI parsing and can make mistakes. Always refer to the latest BEO sent directly by the sales team as the ultimate source of truth.
          </p>
        </div>
        <button 
          onClick={() => {
            setIsVisible(false);
            sessionStorage.setItem("hasSeenDisclaimer", "true");
          }} 
          className="text-amber-800 hover:text-amber-950 text-xs font-bold px-2 py-0.5"
        >
          ✕
        </button>
      </div>
    </div>
  );
}