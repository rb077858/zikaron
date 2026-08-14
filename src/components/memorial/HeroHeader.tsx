import type { Memorial } from "@/lib/memorials";

export function HeroHeader({ memorial }: { memorial: Memorial }) {
  const birthYear = memorial.birthDate.slice(0, 4);
  const deathYear = memorial.deathDate.slice(0, 4);

  return (
    <div id="top" className="scroll-mt-nav relative px-5 pb-10 pt-14 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(212,175,106,0.2), transparent 65%)",
        }}
      />
      <div className="relative mx-auto flex max-w-lg flex-col items-center">
        {memorial.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memorial.coverPhotoUrl}
            alt={`${memorial.firstName} ${memorial.lastName}`}
            className="size-32 rounded-full border-4 border-gold/60 object-cover shadow-lg sm:size-40"
          />
        ) : (
          <div className="flex size-32 items-center justify-center rounded-full border-4 border-gold/60 bg-surface text-4xl sm:size-40">
            🕯️
          </div>
        )}
        <p className="mt-5 text-sm text-muted">לעילוי נשמת</p>
        <h1 className="mt-1 text-3xl font-extrabold text-gold-soft sm:text-4xl">
          {memorial.firstName} {memorial.lastName}
        </h1>
        <p className="mt-2 text-lg text-muted">
          {birthYear} – {deathYear}
        </p>
      </div>
    </div>
  );
}
