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
  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${publicUrl}`
    : publicUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR-Code & Link" size="sm">
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-600">{handoutTitle}</p>

        <div className="flex justify-center p-4 bg-white border rounded-lg">
          <QRCodeSVG value={fullUrl} size={200} />
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono break-all text-gray-700">
          {fullUrl}
        </div>

        <div className="flex gap-2">
          <button
            className="btn-secondary flex-1"
            onClick={handleCopy}
          >
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
