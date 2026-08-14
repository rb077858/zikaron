# זיכרון — דפי הנצחה דיגיטליים

מערכת ליצירת דפי הנצחה דיגיטליים: התחברות עם Google, יצירת דף הנצחה מלא (פרטים,
תמונות, סיפור חיים, קיר נרות, יום השנה הבא לפי הלוח העברי) וקבלת קישור + ברקוד
להדבקה על המצבה.

הפרויקט בנוי ב-Next.js (App Router) ומשתמש ב-**Firebase** (Authentication,
Firestore, Storage) כבאקאנד לגמרי — אין כאן שרת/מסד נתונים עצמאיים. שרת ה-Next.js
עצמו רק מגיש את דפי ה-HTML/JS; כל הלוגיקה (התחברות, שמירה, העלאת קבצים) קורית
ישירות מהדפדפן מול Firebase.

## הקמת פרויקט Firebase (חובה לפני הרצה)

1. צרו פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → הפעילו את ספק **Google**.
   - תחת Settings → Authorized domains הוסיפו את הדומיין שבו האתר יתארח (למשל
     `r.is-cool.dev`), וגם `localhost` לפיתוח מקומי.
3. **Firestore Database** → צרו מסד נתונים (במצב production).
4. **Storage** → הפעילו (Get started) עם ה-bucket שנוצר כברירת מחדל.
5. **Project settings** → General → Your apps → הוסיפו אפליקציית **Web**, והעתיקו
   את פרטי ה-config שמתקבלים (apiKey, authDomain וכו').
6. פרסו את חוקי האבטחה שבתיקיית הפרויקט (חשוב! בלי זה הכל חסום כברירת מחדל):

   ```bash
   npm install -g firebase-tools   # אם עוד אין
   firebase login
   firebase use --add               # בחרו את הפרויקט שיצרתם
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## הרצה מקומית

```bash
cp .env.example .env
# ערכו את .env והדביקו את פרטי ה-Firebase config שהעתקתם למעלה
npm install
npm run dev
```

האתר ירוץ בכתובת `http://localhost:3000/zikaron` (עם ה-basePath המוגדר, ראו למטה).

### פיתוח מול אמולטורים (בלי לגעת בפרויקט האמיתי)

אפשר לפתח מול [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
כדי לא ליצור נתונים אמיתיים בזמן פיתוח:

```bash
firebase emulators:start --only auth,firestore,storage
```

ואז ב-`.env` הגדירו `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"` (יש לבנות מחדש
לאחר שינוי משתני `NEXT_PUBLIC_*`, כיוון שהם מוטמעים ב-build).

## פריסה לשרת שלכם (r.is-cool.dev/zikaron)

האפליקציה היא Next.js סטנדרטי שרץ עם `next start` — אין צורך במסד נתונים או
באחסון קבצים בשרת עצמו, רק Node.js.

```bash
npm install
npm run build
npm run start -- -p 3000    # או פורט אחר לפי הצורך
```

הריצו מאחורי reverse proxy (nginx / Caddy וכו') שמפנה בקשות מ-`r.is-cool.dev/zikaron`
לפורט שבו רץ `next start`. מומלץ להריץ עם מנהל תהליכים כמו `pm2` או `systemd` כדי
שהשרת יעלה מחדש אוטומטית.

**חשוב:** ודאו שב-`.env` (בזמן ה-`build`, לא רק ב-runtime) מוגדרים נכון:

```
NEXT_PUBLIC_BASE_PATH="/zikaron"
NEXT_PUBLIC_SITE_URL="https://r.is-cool.dev/zikaron"
```

`NEXT_PUBLIC_SITE_URL` משמש לבניית קישורים מוחלטים לשיתוף ולברקוד (QR), כך
שהברקוד שמודפס על מצבה יצביע לכתובת הנכונה.

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
  (יצירת דף), `/memorial/[slug]` (דף הנצחה ציבורי), `/memorial/[slug]/edit`.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — חוקי אבטחה
  ואינדקסים ל-Firestore/Storage.

### הערה טכנית: סלאגים (slugs) ב-ASCII

כתובת כל דף הנצחה נגזרת מהשם (למשל `אברהם כהן` → `avraham-cohen`) ומתועתקת
לאותיות לטיניות. הסיבה: Firestore Security Rules לא תמיד מעריכות נכון
`get()`/`resource.data` עבור מסמכים שה-ID שלהם מכיל עברית, וכתובת ASCII גם
נוחה יותר לשיתוף ב-WhatsApp ולברקוד. השם בעברית כמובן מוצג במלואו בתוך הדף.

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
