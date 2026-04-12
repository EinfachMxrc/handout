"use client";

import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[6px] dark:bg-slate-950/60"
        onClick={onClose}
      />
      <div
        className={`relative w-full overflow-hidden ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        style={{
          borderRadius: "0.75rem",
          border: "1px solid var(--line-strong)",
          background: "var(--paper-strong)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 sm:px-8" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Dialog</div>
              <h2 className="mt-2 text-3xl">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
              style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink-muted)" }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
