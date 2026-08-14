"use client";

import { getNextYahrzeit, daysUntil, formatYahrzeitHebrew } from "@/lib/hebrew-date";
import { formatGregorianDateHe } from "@/lib/format";
import { buildYahrzeitIcs, downloadIcs } from "@/lib/ics";
import { memorialAbsoluteUrl } from "@/lib/base-url";
import type { Memorial } from "@/lib/memorials";

export function YahrzeitSection({ memorial }: { memorial: Memorial }) {
  const deathDate = new Date(memorial.deathDate);
  const next = getNextYahrzeit(deathDate);
  const days = daysUntil(next);
  const fullName = `${memorial.firstName} ${memorial.lastName}`;

  function handleAddToCalendar() {
    const ics = buildYahrzeitIcs(fullName, next);
    downloadIcs(`יום-הזיכרון-${fullName}.ics`, ics);
  }

  function handleShareDate() {
    const url = memorialAbsoluteUrl(memorial.slug);
    const text = `יום הזיכרון של ${fullName} יחול ב-${formatGregorianDateHe(
      next
    )} (${formatYahrzeitHebrew(next)}).\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="mb-1 text-xl font-bold text-gold-soft">האזכרה הבאה</h2>
        <p className="mb-6 text-2xl font-extrabold text-foreground">
          {formatGregorianDateHe(next)}{" "}
          <span className="block text-base font-normal text-muted">{formatYahrzeitHebrew(next)}</span>
        </p>

        <div className="section-card mb-6 grid grid-cols-2 divide-x divide-x-reverse divide-border rounded-2xl">
          <div className="px-4 py-5">
            <p className="text-3xl font-extrabold text-gold">{days}</p>
            <p className="text-sm text-muted">ימים</p>
          </div>
          <div className="flex items-center justify-center px-4 py-5 text-sm text-muted">
            ימים שנותרו לאזכרה
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAddToCalendar}
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            📅 הוספה ללוח השנה
          </button>
          <button
            onClick={handleShareDate}
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:border-gold hover:text-gold-soft transition-colors"
          >
            💬 שיתוף תאריך אזכרה
          </button>
        </div>
      </div>
    </section>
  );
}
