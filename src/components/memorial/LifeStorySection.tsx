import type { Memorial } from "@/lib/memorials";

export function LifeStorySection({ memorial }: { memorial: Memorial }) {
  if (!memorial.lifeStory && !memorial.lifeStoryAudioUrl) return null;

  const paragraphs = (memorial.lifeStory || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">📖</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-6 text-center text-2xl font-bold text-gold-soft">סיפור חיים</h2>

        {memorial.lifeStoryAudioUrl && (
          <audio controls className="mb-8 w-full">
            <source src={memorial.lifeStoryAudioUrl} />
          </audio>
        )}

        <div className="space-y-5 text-lg leading-9 text-foreground/90">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
