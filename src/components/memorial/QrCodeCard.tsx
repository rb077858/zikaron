"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { memorialAbsoluteUrl } from "@/lib/base-url";
import { renderPhotoQr } from "@/lib/photo-qr";

const QR_SIZE = 260;

const STYLED_OPTIONS = (url: string): Partial<Options> => ({
  width: QR_SIZE,
  height: QR_SIZE,
  type: "canvas",
  data: url,
  margin: 8,
  qrOptions: { errorCorrectionLevel: "M" },
  dotsOptions: { color: "#241a10", type: "rounded" },
  cornersSquareOptions: { color: "#9c6f18", type: "extra-rounded" },
  cornersDotOptions: { color: "#9c6f18", type: "dot" },
  backgroundOptions: { color: "#fdf8ee" },
});

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export function QrCodeCard({
  slug,
  fullName,
  coverPhotoUrl,
}: {
  slug: string;
  fullName: string;
  coverPhotoUrl?: string | null;
}) {
  const url = memorialAbsoluteUrl(slug);
  const styledContainerRef = useRef<HTMLDivElement>(null);
  const styledQrRef = useRef<QRCodeStyling | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Default styled look — only rendered while no photo has been chosen.
  useEffect(() => {
    if (photoDataUrl) return;
    const qr = new QRCodeStyling(STYLED_OPTIONS(url));
    styledQrRef.current = qr;
    if (styledContainerRef.current) {
      styledContainerRef.current.innerHTML = "";
      qr.append(styledContainerRef.current);
    }
  }, [url, photoDataUrl]);

  // The QR code itself is built from the photo once one is chosen — see
  // src/lib/photo-qr.ts for how the modules are rendered from it.
  useEffect(() => {
    if (!photoDataUrl || !photoCanvasRef.current) return;
    let cancelled = false;
    loadImage(photoDataUrl)
      .then((img) => {
        if (cancelled || !photoCanvasRef.current) return;
        renderPhotoQr(photoCanvasRef.current, url, img, img.naturalWidth, img.naturalHeight);
      })
      .catch(() => {
        if (!cancelled) setPhotoError("לא הצלחנו לצייר את הברקוד מהתמונה. נסו תמונה אחרת.");
      });
    return () => {
      cancelled = true;
    };
  }, [url, photoDataUrl]);

  function handleDownload() {
    if (photoDataUrl && photoCanvasRef.current) {
      const link = document.createElement("a");
      link.download = `ברקוד-${fullName}.png`;
      link.href = photoCanvasRef.current.toDataURL("image/png");
      link.click();
      return;
    }
    styledQrRef.current?.download({ name: `ברקוד-${fullName}`, extension: "png" });
  }

  async function handleUseCoverPhoto() {
    if (!coverPhotoUrl) return;
    setLoadingPhoto(true);
    setPhotoError(null);
    try {
      const res = await fetch(coverPhotoUrl, { mode: "cors" });
      const blob = await res.blob();
      setPhotoDataUrl(await fileToDataUrl(blob));
    } catch {
      setPhotoError("לא הצלחנו לטעון את התמונה הראשית. אפשר להעלות תמונה אחרת.");
    } finally {
      setLoadingPhoto(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    fileToDataUrl(file)
      .then(setPhotoDataUrl)
      .catch(() => setPhotoError("לא ניתן לקרוא את הקובץ שנבחר."));
  }

  return (
    <div className="section-card flex flex-col items-center gap-4 rounded-2xl p-6 text-center">
      <p className="text-sm text-muted">
        {photoDataUrl ? "הברקוד עצמו בנוי מהתמונה שבחרתם" : "ברקוד מעוצב להדבקה על המצבה"}
      </p>

      <div className="overflow-hidden rounded-xl p-3" style={{ background: "#fdf8ee" }}>
        <div ref={styledContainerRef} className={photoDataUrl ? "hidden" : ""} />
        <canvas
          ref={photoCanvasRef}
          className={photoDataUrl ? "block" : "hidden"}
          style={{ width: QR_SIZE, height: QR_SIZE }}
        />
      </div>
      {loadingPhoto && <p className="text-xs text-muted">טוען תמונה...</p>}

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
        {coverPhotoUrl && (
          <button
            type="button"
            onClick={handleUseCoverPhoto}
            disabled={loadingPhoto}
            className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft disabled:opacity-60"
          >
            הפיכת התמונה הראשית לברקוד
          </button>
        )}
        <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft">
          העלאת תמונה אחרת לברקוד
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {photoDataUrl && (
          <button
            type="button"
            onClick={() => setPhotoDataUrl(null)}
            className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft"
          >
            חזרה לברקוד רגיל
          </button>
        )}
      </div>
      {photoError && <p className="text-xs text-red-400">{photoError}</p>}

      <button
        onClick={handleDownload}
        className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
      >
        הורדת ברקוד (PNG)
      </button>
    </div>
  );
}
