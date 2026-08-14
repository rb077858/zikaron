// Kept in sync by hand with the (now-removed) client-side version — slugs
// are transliterated to ASCII because Firestore's rules engine can't
// reliably evaluate resource.data for Hebrew-character document IDs, and
// ASCII slugs are friendlier in shared links / QR codes.
const HEBREW_TRANSLITERATION: Record<string, string> = {
  א: "", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "ch", ט: "t",
  י: "y", כ: "k", ך: "k", ל: "l", מ: "m", ם: "m", נ: "n", ן: "n", ס: "s",
  ע: "", פ: "p", ף: "p", צ: "tz", ץ: "tz", ק: "k", ר: "r", ש: "sh", ת: "t",
};

function transliterate(text: string): string {
  return Array.from(text)
    .map((ch) => HEBREW_TRANSLITERATION[ch] ?? ch)
    .join("");
}

export function slugify(firstName: string, lastName: string): string {
  const raw = transliterate(`${firstName}-${lastName}`.trim());
  const slug = raw
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || `memorial-${Date.now().toString(36)}`;
}
