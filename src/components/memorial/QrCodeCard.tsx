"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { memorialAbsoluteUrl } from "@/lib/base-url";

const QR_SIZE = 220;

function buildOptions(url: string, logoDataUrl: string | null): Partial<Options> {
  return {
    width: QR_SIZE,
    height: QR_SIZE,
    type: "canvas",
    data: url,
    margin: 8,
    qrOptions: { errorCorrectionLevel: logoDataUrl ? "H" : "M" },
    dotsOptions: { color: "#2a2013", type: "rounded" },
    cornersSquareOptions: { color: "#b8873f", type: "extra-rounded" },
    cornersDotOptions: { color: "#b8873f", type: "dot" },
    backgroundOptions: { color: "#ffffff" },
    image: logoDataUrl ?? undefined,
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 6,
      imageSize: 0.35,
      hideBackgroundDots: true,
    },
  };
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Rebuilding the whole instance (rather than calling .update()) on every
  // change is simpler to reason about and cheap enough for something that
  // only changes when the owner picks a different embedded image.
  useEffect(() => {
    const qr = new QRCodeStyling(buildOptions(url, logoDataUrl));
    qrRef.current = qr;
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      qr.append(containerRef.current);
    }
  }, [url, logoDataUrl]);

  function handleDownload() {
    qrRef.current?.download({ name: `ברקוד-${fullName}`, extension: "png" });
  }

  async function handleUseCoverPhoto() {
    if (!coverPhotoUrl) return;
    setLoadingLogo(true);
    setLogoError(null);
    try {
      const res = await fetch(coverPhotoUrl, { mode: "cors" });
      const blob = await res.blob();
      setLogoDataUrl(await fileToDataUrl(blob));
    } catch {
      setLogoError("לא הצלחנו לטעון את התמונה הראשית להטבעה. אפשר להעלות תמונה אחרת.");
    } finally {
      setLoadingLogo(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    fileToDataUrl(file)
      .then(setLogoDataUrl)
      .catch(() => setLogoError("לא ניתן לקרוא את הקובץ שנבחר."));
  }

  return (
    <div className="section-card flex flex-col items-center gap-4 rounded-2xl p-6 text-center">
      <p className="text-sm text-muted">ברקוד מעוצב להדבקה על המצבה</p>
      <div ref={containerRef} className="overflow-hidden rounded-xl bg-white p-3" />

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
        {coverPhotoUrl && (
          <button
            type="button"
            onClick={handleUseCoverPhoto}
            disabled={loadingLogo}
            className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft disabled:opacity-60"
          >
            {loadingLogo ? "טוען..." : "הטבעת התמונה הראשית"}
          </button>
        )}
        <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft">
          העלאת תמונה להטבעה
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {logoDataUrl && (
          <button
            type="button"
            onClick={() => setLogoDataUrl(null)}
            className="rounded-full border border-border px-3 py-1.5 transition-colors hover:border-gold hover:text-gold-soft"
          >
            הסרת התמונה
          </button>
        )}
      </div>
      {logoError && <p className="text-xs text-red-400">{logoError}</p>}

      <button
        onClick={handleDownload}
        className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
      >
        הורדת ברקוד (PNG)
      </button>
    </div>
  );
}
