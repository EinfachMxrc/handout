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
          <div className="eyebrow">Öffentliche Leseransicht</div>
          <p className="mt-3 text-lg font-semibold">{handoutTitle}</p>
        </div>

        <div className="flex justify-center rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--paper-strong)" }}>
          <QRCodeSVG value={fullUrl} size={200} />
        </div>

        <div className="rounded-2xl px-4 py-3 text-left font-mono text-sm break-all" style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink-soft)" }}>
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
            Öffnen
          </a>
        </div>
      </div>
    </Modal>
  );
}
