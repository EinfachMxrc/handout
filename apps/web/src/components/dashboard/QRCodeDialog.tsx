"use client";

import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/ui/Modal";

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
  handoutTitle: string;
}

export function QRCodeDialog({ isOpen, onClose, publicUrl, handoutTitle }: QRCodeDialogProps) {
  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR-Code und Link" size="sm">
      <div className="space-y-5 text-center">
        <div>
          <div className="eyebrow">Oeffentliche Leseransicht</div>
          <p className="mt-3 text-lg font-semibold text-stone-900">{handoutTitle}</p>
        </div>

        <div className="flex justify-center rounded-[28px] border border-stone-900/8 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <QRCodeSVG value={fullUrl} size={200} />
        </div>

        <div className="rounded-[24px] border border-stone-900/8 bg-stone-100/70 px-4 py-3 text-left font-mono text-sm break-all text-stone-700">
          {fullUrl}
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={handleCopy}>
            Link kopieren
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 text-center"
          >
            Oeffnen
          </a>
        </div>
      </div>
    </Modal>
  );
}
