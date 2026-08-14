const PSALM_100 = [
  "מִזְמוֹר לְתוֹדָה הָרִיעוּ לַיהוָה כָּל־הָאָרֶץ׃",
  "עִבְדוּ אֶת־יְהוָה בְּשִׂמְחָה בֹּאוּ לְפָנָיו בִּרְנָנָה׃",
  "דְּעוּ כִּי־יְהוָה הוּא אֱלֹהִים הוּא־עָשָׂנוּ וְלוֹ אֲנַחְנוּ עַמּוֹ וְצֹאן מַרְעִיתוֹ׃",
  "בֹּאוּ שְׁעָרָיו בְּתוֹדָה חֲצֵרֹתָיו בִּתְהִלָּה הוֹדוּ־לוֹ בָּרְכוּ שְׁמוֹ׃",
  "כִּי־טוֹב יְהוָה לְעוֹלָם חַסְדּוֹ וְעַד־דֹּר וָדֹר אֱמוּנָתוֹ׃",
];

export function TehilimSection({ chapter }: { chapter?: number }) {
  const selected = chapter && chapter !== 100 ? chapter : null;

  return (
    <section id="tehilim" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">📖</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gold-soft">פרק תהילים</h2>
        <p className="mb-6 text-center text-sm text-muted">תהילים פרק ק&#39; — מזמור לתודה</p>

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

        {selected && (
          <p className="mt-6 text-center text-sm text-muted">
            לזכרו/ה מוקדש גם פרק תהילים {selected}׳ —{" "}
            <a
              href={`https://www.sefaria.org.il/Psalms.${selected}?lang=he`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-soft hover:underline"
            >
              קריאת הפרק המלא
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
