# זיכרון — דפי הנצחה דיגיטליים

מערכת ליצירת דפי הנצחה דיגיטליים: התחברות עם Google, יצירת דף הנצחה מלא (פרטים,
תמונות, סיפור חיים, קיר נרות, יום השנה הבא לפי הלוח העברי) וקבלת קישור + ברקוד
להדבקה על המצבה.

**אין כאן שרת להריץ.** האתר הוא קובצי HTML/JS סטטיים בלבד, שמתארחים ב-GitHub
Pages תחת `r.is-cool.dev/zikaron`. כל מה שדינמי (התחברות, שמירת דפים, העלאת
תמונות, קיר הנרות) קורה ישירות מהדפדפן מול **Firebase** (Authentication,
Firestore, Storage). אחרי ההגדרה החד-פעמית למטה, כל עדכון לאתר הוא סתם
`git push` — GitHub Actions בונה ומפרסם אוטומטית.

## הגדרה חד-פעמית

שני חלקים, שניהם דרך דפדפן — לא צריך טרמינל בכלל (אלא אם תרצו, ראו הערה בסוף).

### 1. פרויקט Firebase

1. צרו פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → הפעילו את ספק **Google**.
   בטאב Settings → Authorized domains הוסיפו את `r.is-cool.dev`.
3. **Firestore Database** → Create database (Production mode).
4. **Storage** → Get started (עם ה-bucket שנוצר כברירת מחדל).
5. **Firestore → Rules**: העתיקו את התוכן של הקובץ [`firestore.rules`](./firestore.rules)
   מהריפו והדביקו שם, ואז Publish.
6. **Storage → Rules**: אותו דבר עם [`storage.rules`](./storage.rules).
7. **Project settings** (גלגל השיניים) → General → Your apps → הוסיפו אפליקציית
   **Web** (סמל `</>`), תנו לה שם, ותעתיקו את ערכי ה-config שמופיעים
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`) — תצטרכו אותם בשלב הבא.

### 2. חיבור ל-GitHub Pages

1. בריפו הזה: **Settings → Secrets and variables → Actions → New repository
   secret**, והוסיפו שישה סודות עם השמות הבאים והערכים שהעתקתם משלב 1:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
2. **Settings → Pages** → תחת Build and deployment → Source, בחרו
   **GitHub Actions**.
3. מזגו את הענף הזה ל-`main` (או פשוט דחפו אליו) — ה-workflow
   [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ירוץ
   אוטומטית, יבנה את האתר ויפרסם אותו.
4. מכיוון ש-`r.is-cool.dev` כבר מוגדר כדומיין המותאם אישית של חשבון ה-GitHub
   Pages שלכם, האתר של הריפו הזה יופיע אוטומטית תחת `r.is-cool.dev/zikaron`
   (בלי צורך בהגדרת CNAME נוסף בריפו הזה).

**זהו.** מעכשיו, כל `git push` ל-`main` מפרסם גרסה מעודכנת אוטומטית — אין
צורך להריץ שום דבר בעצמכם.

## איך זה עובד מתחת למכסה

- **Next.js** (App Router) בנוי במצב `output: "export"` — כלומר `next build`
  מפיק תיקיית `out/` עם קבצי HTML/CSS/JS סטטיים בלבד, בלי שרת Node.js בכלל.
- **GitHub Actions** (`.github/workflows/deploy.yml`) מריץ `npm run build`
  עם משתני הסביבה הציבוריים (config של Firebase) מוזרקים מה-Secrets, ומעלה
  את `out/` ל-GitHub Pages דרך `actions/deploy-pages`.
- **Firebase** הוא הבאקאנד היחיד: Authentication (Google), Firestore
  (מסד הנתונים) ו-Storage (תמונות/הקלטות). האבטחה נאכפת ע"י חוקי Firestore/
  Storage Rules (בריפו: `firestore.rules`, `storage.rules`) — לא ע"י שרת.

### הערה טכנית: כתובות הדפים

כתובת כל דף הנצחה היא `/memorial?slug=...` (query string) ולא נתיב דינמי
כמו `/memorial/avraham-cohen` — כי אחסון סטטי (GitHub Pages) לא יכול לפענח
בזמן אמת נתיב שנוצר אחרי הפרסום (כל דף הנצחה שנוצר ע"י משתמש). כתובת ה-slug
עצמה מתועתקת אוטומטית לאנגלית (`אברהם כהן` → `avraham-cohen`) — גם כדי
שתהיה תקינה בברקוד/שיתוף ב-WhatsApp, וגם כי מנוע חוקי האבטחה של Firestore לא
מסתדר טוב עם ID של מסמך שמכיל עברית. השם בעברית כמובן מוצג במלואו בתוך הדף.

## מבנה הפרויקט

- `src/lib/firebase.ts` — אתחול Firebase client SDK (Auth/Firestore/Storage).
- `src/lib/use-auth.ts` — hook להתחברות/התנתקות עם Google.
- `src/lib/memorials.ts` — כל פעולות ה-CRUD מול Firestore/Storage (יצירה,
  עריכה, מחיקה, העלאת תמונות/הקלטה, קיר נרות).
- `src/lib/hebrew-date.ts` — המרת תאריכים לועזי/עברי וחישוב יום השנה הבא
  (יארצייט) באמצעות [`@hebcal/core`](https://github.com/hebcal/hebcal-es6).
- `src/components/memorial/` — כל הרכיבים של דף ההנצחה הציבורי (נר, תעודת
  זהות, סיפור חיים, מדיה, תהילים, יום השנה, מצבה, שיתוף, ברקוד).
- `src/app/` — הדפים: `/` (נחיתה), `/dashboard` (הדפים שלי), `/create`
  (יצירת דף), `/memorial` (דף הנצחה ציבורי, `?slug=`), `/memorial/edit`.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — חוקי אבטחה
  ואינדקסים ל-Firestore/Storage.
- `.github/workflows/deploy.yml` — בנייה ופרסום אוטומטיים ל-GitHub Pages.

## תכונות עיקריות

- התחברות עם Google, ולכל משתמש דף "הדפים שלי" עם כל דפי ההנצחה שיצר.
- טופס יצירה/עריכה מלא: שם, הורים, בן/בת זוג, ילדים, עיסוק, תאריכים, מקום
  קבורה, סיפור חיים (+ הקלטת קול אופציונלית), קישור לסרטון, תמונה ראשית,
  גלריית תמונות, תמונת מצבה וקישור ניווט אליה.
- דף הנצחה ציבורי מעוצב עם ניווט עוגן (הדלקת נר / תהילים / מדיה / מי אני /
  ראשי), קיר נרות ותגובות פתוח לכולם, תעודת זהות, תאריך עברי מחושב אוטומטית,
  יום השנה הבא + ספירה לאחור + הוספה ליומן (ICS) + שיתוף ב-WhatsApp, תמונת
  מצבה עם ניווט, וכפתורי שיתוף לרשתות.
- ברקוד (QR) ייחודי לכל דף, ניתן להורדה כ-PNG להדפסה על המצבה — מוצג לבעל/ת
  הדף בלבד.

## פיתוח מקומי (רק אם תרצו לשנות קוד)

לא נדרש כדי שהאתר יעבוד בפרודקשן — זה רק אם תרצו לערוך את הקוד ולבדוק שינויים
לפני שדוחפים אותם.

```bash
cp .env.example .env
# ערכו את .env והדביקו את פרטי ה-Firebase config (או הפעילו אמולטורים, ראו למטה)
npm install
npm run dev
```

האתר ירוץ בכתובת `http://localhost:3000/zikaron`.

לפיתוח בלי לגעת בפרויקט ה-Firebase האמיתי, אפשר להריץ מול
[Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite):

```bash
firebase emulators:start --only auth,firestore,storage
```

ואז ב-`.env` הגדירו `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"` (יש לבנות
מחדש לאחר שינוי משתני `NEXT_PUBLIC_*`, כיוון שהם מוטמעים ב-build).

כדי לבדוק את קובצי הפלט הסטטיים בדיוק כמו שהם ייראו ב-GitHub Pages (במקום
`next dev`): `npm run build && npm run preview`.
