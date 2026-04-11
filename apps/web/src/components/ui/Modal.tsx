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
        className="absolute inset-0 bg-stone-950/35 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div
        className={`relative w-full overflow-hidden rounded-[32px] border border-stone-900/10 bg-[rgba(255,251,244,0.96)] shadow-[0_30px_90px_rgba(28,22,15,0.22)] ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-900/8 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Dialog</div>
              <h2 className="mt-2 text-3xl">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-900/10 bg-white/70 text-stone-500 transition-colors hover:text-stone-900"
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
