import { ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white w-full ${
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        } max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-lg shadow-2xl`}
      >
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="font-display font-semibold text-lg text-ink">{title}</div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-ink text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
