"use client";

import { useState, useSyncExternalStore } from "react";
import { memorialAbsoluteUrl } from "@/lib/base-url";
import { copyText, shareText } from "@/lib/share";

const NETWORKS = [
  {
    name: "WhatsApp",
    icon: "💬",
    url: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}`,
  },
  {
    name: "Telegram",
    icon: "✈️",
    url: (u: string, t: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    name: "Facebook",
    icon: "📘",
    url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    name: "X",
    icon: "🐦",
    url: (u: string, t: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
];

const noopSubscribe = () => () => {};

export function ShareRow({ slug, fullName }: { slug: string; fullName: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  // false while prerendering, real value in the browser (no hydration mismatch)
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );
  const url = memorialAbsoluteUrl(slug);
  const text = `לזכרו/ה של ${fullName}`;

  async function copyLink() {
    setCopied((await copyText(url)) ? "ok" : "fail");
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <section className="px-5 py-14 text-center">
      <h2 className="mb-6 text-lg font-bold text-gold-soft">שתפו חברים</h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {NETWORKS.map((n) => (
          <a
            key={n.name}
            href={n.url(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-xl transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
            aria-label={n.name}
          >
            {n.icon}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="flex h-12 items-center justify-center rounded-full border border-border px-4 text-sm hover:border-gold hover:text-gold-soft transition-colors"
        >
          {copied === "ok" ? "✓ הקישור הועתק" : copied === "fail" ? "ההעתקה נכשלה" : "🔗 העתקת קישור"}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={() => void shareText(text, url, fullName)}
            className="flex h-12 items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            📤 שיתוף
          </button>
        )}
      </div>
    </section>
  );
}
