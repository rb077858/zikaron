import { HDate } from "@hebcal/core";

/** Renders a Gregorian date as a Hebrew date string, e.g. "כ׳ בְּחֶשְׁוָן תשפ״ה". */
export function toHebrewDateString(date: Date): string {
  return new HDate(date).renderGematriya();
}

function resolveAdarMonth(deathMonthName: string, targetIsLeap: boolean): number {
  // Non-leap years have a single Adar (month 12). Leap years have Adar I (12) and Adar II (13).
  if (deathMonthName === "Adar I") return 12;
  if (deathMonthName === "Adar" || deathMonthName === "Adar II") {
    // Common (Ashkenazi/hebcal default) practice: yahrzeit for a death in the
    // single Adar of a regular year falls in Adar II during a leap year.
    return targetIsLeap ? 13 : 12;
  }
  return HDate.monthFromName(deathMonthName);
}

/**
 * Finds the next occurrence (on or after `from`) of the Hebrew-calendar
 * anniversary (yahrzeit) of `deathDate`.
 */
export function getNextYahrzeit(deathDate: Date, from: Date = new Date()): Date {
  const deathHD = new HDate(deathDate);
  const deathMonthName = deathHD.getMonthName();
  const deathDay = deathHD.getDate();

  const fromHD = new HDate(from);
  let hyear = fromHD.getFullYear();

  const buildForYear = (year: number): HDate => {
    const isLeap = HDate.isLeapYear(year);
    const isAdarDeath =
      deathMonthName === "Adar" ||
      deathMonthName === "Adar I" ||
      deathMonthName === "Adar II";
    const month = isAdarDeath
      ? resolveAdarMonth(deathMonthName, isLeap)
      : HDate.monthFromName(deathMonthName);
    const daysInMonth = HDate.daysInMonth(month, year);
    const day = Math.min(deathDay, daysInMonth);
    return new HDate(day, month, year);
  };

  let candidate = buildForYear(hyear);
  if (candidate.abs() < fromHD.abs()) {
    hyear += 1;
    candidate = buildForYear(hyear);
  }
  return candidate.greg();
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateAge(birthDate: Date, deathDate: Date): string {
  let years = deathDate.getFullYear() - birthDate.getFullYear();
  let months = deathDate.getMonth() - birthDate.getMonth();
  if (deathDate.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (months === 0) return `${years} שנים`;
  return `${years} שנים ו-${months} חודשים`;
}

const HEBREW_MONTH_HE: Record<string, string> = {
  Nisan: "ניסן",
  Iyyar: "אייר",
  Sivan: "סיוון",
  Tamuz: "תמוז",
  Av: "אב",
  Elul: "אלול",
  Tishrei: "תשרי",
  Cheshvan: "חשוון",
  Kislev: "כסלו",
  Tevet: "טבת",
  "Sh'vat": "שבט",
  "Adar I": "אדר א׳",
  "Adar II": "אדר ב׳",
  Adar: "אדר",
};

/** Formats the upcoming yahrzeit as a full Hebrew date string, e.g. "כ׳ בְּחֶשְׁוָן תשפ״ז". */
export function formatYahrzeitHebrew(date: Date): string {
  return new HDate(date).renderGematriya();
}

export function hebrewMonthName(name: string): string {
  return HEBREW_MONTH_HE[name] ?? name;
}
