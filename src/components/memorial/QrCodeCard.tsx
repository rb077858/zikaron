"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { memorialAbsoluteUrl } from "@/lib/base-url";

export function QrCodeCard({ slug, fullName }: { slug: string; fullName: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const url = memorialAbsoluteUrl(slug);

  function handleDownload() {
    const canvas = wrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ברקוד-${fullName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="section-card flex flex-col items-center gap-4 rounded-2xl p-6 text-center">
      <p className="text-sm text-muted">ברקוד להדבקה על המצבה</p>
      <div ref={wrapperRef} className="rounded-xl bg-white p-3">
        <QRCodeCanvas value={url} size={180} level="M" />
      </div>
      <button
        onClick={handleDownload}
        className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
      >
        הורדת ברקוד (PNG)
      </button>
    </div>
  );
}
