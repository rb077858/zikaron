"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/base-url";
import { toGematria } from "@/lib/gematria";

// Full text of every chapter ships with the site (public/tehilim/<n>.json,
// public-domain text from tanach.us via Sefaria, nikud without te'amim,
// keri in place of ketiv), so it shows right on the page with no outside
// service involved.

type LoadState = { chapter: number; verses: string[] | null; failed: boolean };

export function TehilimSection({ chapter }: { chapter?: number | null }) {
  const valid = !!chapter && Number.isInteger(chapter) && chapter >= 1 && chapter <= 150;
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    fetch(`${BASE_PATH}/tehilim/${chapter}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : Promise.reject(new Error(String(r.status)))))
      .then((verses) => !cancelled && setState({ chapter: chapter!, verses, failed: false }))
      .catch(() => !cancelled && setState({ chapter: chapter!, verses: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [chapter, valid]);

  // The dedication is entirely optional per memorial — nothing renders (and
  // the nav tab is hidden) unless the page's creator actually chose a chapter.
  if (!valid) return null;

  const current = state?.chapter === chapter ? state : null;
  const name = toGematria(chapter!);

  return (
    <section id="tehilim" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">📖</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gold-soft">תהילים פרק {name}</h2>
        <p className="mb-6 text-center text-sm text-muted">פרק תהילים מוקדש לעילוי הנשמה</p>

        <div className="section-card rounded-2xl px-6 py-8 sm:px-10" dir="rtl">
          {current?.verses ? (
            <ol className="tehilim-text space-y-3 text-right text-[1.2rem] leading-[2.4rem] text-foreground/90">
              {current.verses.map((verse, i) => (
                <li key={i}>
                  <span className="ml-1.5 align-baseline text-sm font-bold text-gold" aria-hidden>
                    {toGematria(i + 1, { marks: false })}
                  </span>
                  {verse}
                </li>
              ))}
            </ol>
          ) : current?.failed ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <p className="text-muted">לא הצלחנו לטעון את הפרק כרגע.</p>
              <a
                href={`https://www.sefaria.org.il/Psalms.${chapter}?lang=he`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-soft"
              >
                קריאת הפרק בספריא
              </a>
            </div>
          ) : (
            <div className="space-y-4 py-2" aria-label="טוען את הפרק">
              {[92, 100, 85, 96, 70].map((w, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-surface-2" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
