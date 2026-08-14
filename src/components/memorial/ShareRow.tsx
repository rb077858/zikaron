"use client";

import { useState } from "react";
import { memorialAbsoluteUrl } from "@/lib/base-url";

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

export function ShareRow({ slug, fullName }: { slug: string; fullName: string }) {
  const [copied, setCopied] = useState(false);
  const url = memorialAbsoluteUrl(slug);
  const text = `לזכרו/ה של ${fullName}`;

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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
            className="flex size-12 items-center justify-center rounded-full border border-border text-xl hover:border-gold transition-colors"
            aria-label={n.name}
          >
            {n.icon}
          </a>
        ))}
        <button
          onClick={copyLink}
          className="flex h-12 items-center justify-center rounded-full border border-border px-4 text-sm hover:border-gold hover:text-gold-soft transition-colors"
        >
          {copied ? "הקישור הועתק!" : "🔗 העתקת קישור"}
        </button>
      </div>
    </section>
  );
}
