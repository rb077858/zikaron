import type { Memorial } from "@/lib/memorials";
import { toHebrewDateString, calculateAge } from "@/lib/hebrew-date";
import { formatGregorianDateHe } from "@/lib/format";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function IdCardSection({ memorial }: { memorial: Memorial }) {
  const birth = new Date(memorial.birthDate);
  const death = new Date(memorial.deathDate);

  return (
    <section id="whoami" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">🪪</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-6 text-center text-2xl font-bold text-gold-soft">תעודת זהות</h2>

        <div className="section-card rounded-2xl px-6 py-2">
          <Row label="שם פרטי" value={memorial.firstName} />
          <Row label="שם משפחה" value={memorial.lastName} />
          <Row label="שם האבא" value={memorial.fatherName} />
          <Row label="שם האמא" value={memorial.motherName} />
          <Row label="בת/בן זוג" value={memorial.spouseName} />
          <Row label="ילדים" value={memorial.childrenNames} />
          <Row label="עיסוק" value={memorial.occupation} />
          <Row
            label="תאריך לידה"
            value={`${formatGregorianDateHe(birth)} (${toHebrewDateString(birth)})`}
          />
          <Row
            label="תאריך פטירה"
            value={`${formatGregorianDateHe(death)} (${toHebrewDateString(death)})`}
          />
          <Row label="גיל פטירה" value={calculateAge(birth, death)} />
          <Row label="מקום קבורה" value={memorial.burialPlace} />
        </div>
      </div>
    </section>
  );
}
