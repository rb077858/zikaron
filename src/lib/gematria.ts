const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/**
 * A number (1–499) in Hebrew letters, the way chapters are written:
 * 1 → א׳, 67 → ס״ז, 15 → ט״ו, 16 → ט״ז, 150 → ק״נ.
 * `marks: false` leaves out the geresh/gershayim (for verse numbers).
 */
export function toGematria(n: number, { marks = true }: { marks?: boolean } = {}): string {
  if (!Number.isInteger(n) || n < 1 || n > 499) return String(n);
  let letters = HUNDREDS[Math.floor(n / 100)];
  const rest = n % 100;
  // 15 and 16 are written ט״ו / ט״ז, not spelling out a divine name.
  if (rest === 15) letters += "טו";
  else if (rest === 16) letters += "טז";
  else letters += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  if (!marks) return letters;
  return letters.length === 1 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}
