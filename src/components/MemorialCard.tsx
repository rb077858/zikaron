"use client";

import Link from "next/link";
import { useState } from "react";
import type { Memorial } from "@/lib/memorials";
import { deleteMemorial } from "@/lib/memorials";
import { memorialAbsoluteUrl } from "@/lib/base-url";

function year(iso: string): string {
  const y = iso?.slice(0, 4);
  return y || "";
}

export function MemorialCard({
  memorial,
  onDeleted,
}: {
  memorial: Memorial;
  onDeleted: (slug: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteMemorial(memorial.slug);
      onDeleted(memorial.slug);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    const url = memorialAbsoluteUrl(memorial.slug);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${memorial.firstName} ${memorial.lastName}`, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="section-card overflow-hidden rounded-2xl">
      <Link href={`/memorial/${memorial.slug}`} className="block">
        <div className="flex h-40 items-center justify-center overflow-hidden bg-surface-2">
          {memorial.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={memorial.coverPhotoUrl}
              alt={memorial.firstName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl">🕯️</span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/memorial/${memorial.slug}`}>
          <h3 className="text-lg font-bold text-gold-soft hover:underline">
            {memorial.firstName} {memorial.lastName}
          </h3>
        </Link>
        <p className="mt-0.5 text-sm text-muted">
          {year(memorial.birthDate)} – {year(memorial.deathDate)}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/memorial/${memorial.slug}/edit`}
            className="rounded-full border border-border px-3 py-1.5 hover:border-gold hover:text-gold-soft transition-colors"
          >
            עריכה
          </Link>
          <button
            onClick={handleShare}
            className="rounded-full border border-border px-3 py-1.5 hover:border-gold hover:text-gold-soft transition-colors"
          >
            {copied ? "הועתק!" : "שיתוף"}
          </button>
          {confirming ? (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              {busy ? "מוחק..." : "אישור מחיקה"}
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-full border border-border px-3 py-1.5 text-muted hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              מחיקה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
