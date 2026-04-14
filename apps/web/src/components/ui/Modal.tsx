"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={`w-full max-w-[calc(100%-2rem)] ${sizeClasses[size]} max-h-[90vh] overflow-y-auto p-0`}>
        <DialogHeader className="border-b px-6 py-5 sm:px-8" style={{ borderColor: "var(--line)" }}>
          <div className="eyebrow">Dialog</div>
          <DialogTitle className="mt-2 text-3xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6 sm:px-8">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
