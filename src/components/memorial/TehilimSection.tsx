const PSALM_100 = [
  "מִזְמוֹר לְתוֹדָה הָרִיעוּ לַיהוָה כָּל־הָאָרֶץ׃",
  "עִבְדוּ אֶת־יְהוָה בְּשִׂמְחָה בֹּאוּ לְפָנָיו בִּרְנָנָה׃",
  "דְּעוּ כִּי־יְהוָה הוּא אֱלֹהִים הוּא־עָשָׂנוּ וְלוֹ אֲנַחְנוּ עַמּוֹ וְצֹאן מַרְעִיתוֹ׃",
  "בֹּאוּ שְׁעָרָיו בְּתוֹדָה חֲצֵרֹתָיו בִּתְהִלָּה הוֹדוּ־לוֹ בָּרְכוּ שְׁמוֹ׃",
  "כִּי־טוֹב יְהוָה לְעוֹלָם חַסְדּוֹ וְעַד־דֹּר וָדֹר אֱמוּנָתוֹ׃",
];

export function TehilimSection({ chapter }: { chapter?: number | null }) {
  // The dedication is entirely optional per memorial — nothing renders (and
  // the nav tab is hidden) unless the page's creator actually chose a chapter.
  if (!chapter) return null;

  return (
    <section id="tehilim" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">📖</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gold-soft">
          פרק תהילים מוקדש
        </h2>
        <p className="mb-6 text-center text-sm text-muted">
          לעילוי נשמה נקרא פרק תהילים {chapter}&#39;
        </p>

        {chapter === 100 ? (
          <div className="section-card rounded-2xl px-8 py-8 text-center" dir="rtl">
            <ol className="space-y-3 text-lg leading-9 text-foreground/90">
              {PSALM_100.map((verse, i) => (
                <li key={i}>
                  <span className="ml-2 text-gold">{i + 1}</span>
                  {verse}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="section-card flex flex-col items-center gap-4 rounded-2xl px-8 py-10 text-center">
            <span className="text-3xl">📜</span>
            <p className="text-lg font-semibold text-foreground/90">
              תהילים פרק {chapter}&#39;
            </p>
            <a
              href={`https://www.sefaria.org.il/Psalms.${chapter}?lang=he`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-soft"
            >
              קריאת הפרק המלא
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
