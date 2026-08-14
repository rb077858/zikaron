import type { Memorial } from "@/lib/memorials";

export function GraveSection({ memorial }: { memorial: Memorial }) {
  if (!memorial.graveImageUrl && !memorial.graveMapUrl) return null;

  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-xl text-center">
        {memorial.graveImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memorial.graveImageUrl}
            alt="מצבה"
            className="mx-auto max-h-[520px] w-full rounded-2xl border border-border object-cover"
          />
        )}
        {memorial.graveMapUrl && (
          <a
            href={memorial.graveMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            📍 ניווט למצבה
          </a>
        )}
      </div>
    </section>
  );
}
