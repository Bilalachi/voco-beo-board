import { useState, useEffect } from "react";

export default function DisclaimerModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show modal once per browser session
    const hasSeen = sessionStorage.getItem("hasSeenDisclaimer");
    
    if (!hasSeen) {
      setIsVisible(true);

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        dismissModal();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  function dismissModal() {
    sessionStorage.setItem("hasSeenDisclaimer", "true");
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        
        <h2 className="font-display text-lg font-bold text-ink">
          Notice / Disclaimer
        </h2>

        <p className="text-sm text-ink-soft leading-relaxed">
          This PWA relies on AI parsing and can make mistakes. Always refer to the original, latest BEO sent directly by the sales team as the ultimate source of truth.
        </p>

        <button
          type="button"
          onClick={dismissModal}
          className="w-full bg-honey-500 hover:bg-honey-600 text-ink font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}