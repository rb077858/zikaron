# זיכרון — דפי הנצחה דיגיטליים

מערכת ליצירת דפי הנצחה דיגיטליים: התחברות עם Google, יצירת דף הנצחה מלא (פרטים,
תמונות, סיפור חיים, יום השנה הבא לפי הלוח העברי) וקבלת קישור + ברקוד
להדבקה על המצבה. יצירת דף עולה **5 קרדיטים** (קרדיט = 1 ₪), שנרכשים דרך
PayPal; עריכת דף קיים תמיד חינמית.

**אין כאן שרת להריץ בעצמכם, ותפעול האתר (לא כולל התשלומים ללקוחות) חינמי
לגמרי.** האתר עצמו הוא קובצי HTML/JS סטטיים, שמתארחים ב-GitHub Pages תחת
`zikaron.r.is-cool.dev` (חינם). ההתחברות ומסד הנתונים רצים ישירות מהדפדפן מול
**Firebase Authentication + Firestore** (חינמיים לגמרי בתוכנית ה-Spark, בלי
כרטיס אשראי). קבצים (תמונות, הקלטות) מועלים ל-**Cloudinary** במקום
ל-Firebase Storage (שדורש שדרוג בתשלום גם לשימוש זעיר). יצירת דף ורכישת
קרדיטים עוברות דרך פונקציית **Cloudflare Worker** קטנה וחינמית — הכרחי כדי
לוודא בצד מהימן (לא בדפדפן, שאפשר לעקוף) שבאמת שולם לפני שנוצר דף, ושתשלום
PayPal אכן התקבל לפני שנזקפים קרדיטים. אחרי ההגדרה החד-פעמית למטה, כל עדכון
לאתר הוא סתם `git push` — GitHub Actions בונה ומפרסם הכל אוטומטית.

## הגדרה חד-פעמית

ארבעה חלקים, כולם דרך דפדפן — כמעט ולא צריך טרמינל (יוצא דופן אחד מסומן למטה).

### 1. פרויקט Firebase (חינם, בלי כרטיס אשראי)

1. צרו פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com).
   השאירו אותו בתוכנית **Spark** (החינמית) — אין צורך לשדרג ל-Blaze בכלל.
2. **Authentication** → Sign-in method → הפעילו את ספק **Google**.
   בטאב Settings → Authorized domains הוסיפו את `zikaron.r.is-cool.dev`.
3. **Firestore Database** → Create database (Production mode).
4. **Firestore → Rules**: העתיקו את התוכן של הקובץ [`firestore.rules`](./firestore.rules)
   מהריפו והדביקו שם, ואז Publish.
5. **Project settings** (גלגל השיניים) → General → Your apps → הוסיפו אפליקציית
   **Web** (סמל `</>`), תנו לה שם, ותעתיקו את ערכי ה-config שמופיעים
   (`apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`).

   **חשוב:** אל תפעילו את **Storage** מה-Firebase Console — הוא דורש שדרוג
   בתשלום. אחסון הקבצים באתר הזה קורה דרך Cloudinary, לא Firebase.
6. עוד ב-Project settings: **Service accounts** → **Generate new private key**
   → נשמר קובץ JSON. תצטרכו ממנו את `client_email` ואת `private_key` בשלב 3
   (ה-Worker) — זו הדרך שבה ה-Worker כותב ל-Firestore בלי לעבור דרך חוקי
   האבטחה (בדיוק כמו Admin SDK). **שמרו את הקובץ הזה בסודיות** ואל תעלו אותו
   לשום מקום.

### 2. חשבון Cloudinary (חינם, בלי כרטיס אשראי) — לתמונות והקלטות

1. הרשמו בחינם ב-[cloudinary.com](https://cloudinary.com).
2. בדף הבית של ה-Dashboard, העתיקו את ה-**Cloud name**.
3. Settings (גלגל השיניים) → Upload → Upload presets → **Add upload preset**.
   שנו את **Signing Mode** ל-**Unsigned**, שמרו, והעתיקו את שם ה-preset.

### 3. Cloudflare Worker + PayPal — התשלומים והקרדיטים

זהו החלק שמוודא שבאמת שולם לפני שנזקפים קרדיטים או נוצר דף — לא ניתן לעשות
זאת בבטחה מהדפדפן בלבד (מישהו טכני יכול פשוט לעקוף בדיקת תשלום שרצה בצד
לקוח).

1. **PayPal**: היכנסו לחשבון ה-PayPal Business שלכם →
   [developer.paypal.com/dashboard/applications](https://developer.paypal.com/dashboard/applications) →
   ודאו שאתם במצב **Live** (לא Sandbox) → **Create App**. העתיקו את ה-**Client
   ID** וה-**Secret**.
2. **Cloudflare**: הרשמו בחינם ב-[cloudflare.com](https://dash.cloudflare.com/sign-up)
   (לא נדרש כרטיס אשראי לתוכנית החינמית של Workers). מה-Dashboard העתיקו את
   ה-**Account ID** (מופיע בסרגל הימני של כל דומיין/של Workers & Pages).
3. צרו **API Token**: My Profile → API Tokens → Create Token → תבנית "Edit
   Cloudflare Workers" מספיקה. העתיקו את הטוקן.
4. בריפו הזה, **Settings → Secrets and variables → Actions → New repository
   secret**, הוסיפו:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` (מהקובץ JSON משלב 1, שדה `client_email`)
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (מהקובץ JSON, שדה `private_key`
     כולל `-----BEGIN PRIVATE KEY-----` ו-`\n`, בדיוק כפי שהוא)
5. ערכו את הקובץ [`worker/wrangler.toml`](./worker/wrangler.toml) בריפו
   (זה כן דורש עריכת קובץ טקסט — הכי קרוב שיש לצעד "לא-דפדפן" כאן) ועדכנו
   שלושה ערכים לא-סודיים:
   - `FIREBASE_PROJECT_ID` — ה-Project ID מ-Firebase
   - `PAYPAL_CLIENT_ID` — מ-PayPal (שלב 1 למעלה)
   - `ALLOWED_ORIGIN` — הדומיין המדויק שהאתר מתארח בו, כולל תת-דומיין אם יש
     (למשל `https://zikaron.r.is-cool.dev`) — חייב להתאים בדיוק לכתובת בשורת
     הכתובת של הדפדפן, אחרת בקשות ה-API מהאתר ל-Worker ייחסמו (CORS)

   קומיטו ודחפו את השינוי (או ערכו ישירות בממשק העריכה של GitHub — זה טקסט
   רגיל, לא סוד).
6. דחיפה ל-`main` מריצה את
   [`.github/workflows/deploy-worker.yml`](./.github/workflows/deploy-worker.yml)
   שמפרסם את ה-Worker אוטומטית ל-`https://zikaron-worker.<your-subdomain>.workers.dev`.
   את הכתובת הזו רואים בלוג של ה-Action, או ב-Cloudflare Dashboard תחת
   Workers & Pages.

### 4. חיבור האתר עצמו ל-GitHub Pages

1. באותו מקום (**Settings → Secrets and variables → Actions**), הוסיפו גם:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   - `NEXT_PUBLIC_WORKER_URL` — הכתובת מסעיף 3.6 למעלה
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — אותו Client ID כמו בסעיף 3.1 (הפעם
     כ"public" — זה בטוח, זה ה-Client ID הציבורי שנועד לרוץ בדפדפן)
2. **Settings → Pages** → תחת Build and deployment → Source, בחרו
   **GitHub Actions**.
3. מזגו את הענף הזה ל-`main` (או פשוט דחפו אליו) — ה-workflow
   [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ירוץ
   אוטומטית, יבנה את האתר ויפרסם אותו.
4. האתר מוגש מתת-הדומיין הייעודי שלו `zikaron.r.is-cool.dev` (לא תחת נתיב
   כמו `r.is-cool.dev/zikaron`). כדי שזה יעבוד צריך:
   - רשומת DNS מסוג `CNAME` אצל ספק הדומיין: `zikaron` → `<your-username>.github.io`.
   - **Settings → Pages → Custom domain** בריפו **הזה** (לא בריפו של עמוד
     המשתמש) — הזינו `zikaron.r.is-cool.dev` ואשרו.

   כתובת `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_BASE_PATH` למעלה כבר מוגדרות
   לתת-דומיין הזה (בלי נתיב `/zikaron` בסוף) — אם תעברו לכתובת אחרת יש לעדכן
   גם אותן וגם את `ALLOWED_ORIGIN` ב-`worker/wrangler.toml` (שלב 3.5) כך
   שתמיד יתאימו בדיוק לכתובת שבשורת הדפדפן.

**זהו.** מעכשיו, כל `git push` ל-`main` מפרסם גרסה מעודכנת אוטומטית של האתר
ושל ה-Worker כאחד — אין צורך להריץ שום דבר בעצמכם.

## מנהל (יצירת דפים ללא הגבלה וללא עלות)

חשבון Google עם המייל `rb077858@gmail.com` מוגדר כמנהל: יכול ליצור דפי הנצחה
ללא הגבלה בלי לצרוך קרדיטים בכלל. הבדיקה הזו קורית בתוך ה-Worker (לא רק
בממשק) — כלומר אי אפשר לזייף אותה מהדפדפן. כדי לשנות את המייל המנהל, ערכו את
`ADMIN_EMAIL` גם ב-`worker/wrangler.toml` וגם ב-`src/lib/credits.ts`.

## איך זה עובד מתחת למכסה

- **Next.js** (App Router) בנוי במצב `output: "export"` — כלומר `next build`
  מפיק תיקיית `out/` עם קבצי HTML/CSS/JS סטטיים בלבד, בלי שרת Node.js בכלל.
- **Firebase Authentication + Firestore** — התחברות עם Google ומסד הנתונים,
  שניהם חינמיים במלואם בתוכנית Spark.
- **Cloudinary** — אחסון קבצים (תמונות, הקלטת סיפור חיים) דרך unsigned upload
  preset, ישירות מהדפדפן. חינמי, בלי כרטיס אשראי, בניגוד ל-Firebase Storage.
- **Cloudflare Worker** (`worker/`) — הגורם המהימן היחיד שמותר לו ליצור דף
  הנצחה או לשנות יתרת קרדיטים (`firestore.rules` חוסם את שני אלה ישירות
  מהדפדפן). לפני יצירת דף: בודק את זהות המשתמש (אימות טוקן Firebase), בודק
  יתרת קרדיטים (או שהמשתמש הוא המנהל), ורק אז יוצר את הדף ומחסיר קרדיטים —
  הכל בפעולה אטומית אחת. לפני זקיפת קרדיטים: **תופס (capture) את תשלום
  PayPal בעצמו בצד שרת** (לא בדפדפן) באמצעות ה-Client Secret הסודי, ומוודא
  שהסכום שבאמת שולם תואם למספר הקרדיטים המבוקש — ורק אז זוקף אותם. גישתו
  ל-Firestore היא כשל Service Account (כמו Admin SDK), ולכן אינה כפופה
  לחוקי האבטחה של הדפדפן.
- **GitHub Actions** — שני workflows: אחד בונה ומפרסם את האתר ל-GitHub Pages,
  ואחד מפרסם את ה-Worker ל-Cloudflare, שניהם בכל דחיפה ל-`main`.

### הערה טכנית: כתובות הדפים

כתובת כל דף הנצחה היא `/memorial?slug=...` (query string) ולא נתיב דינמי
כמו `/memorial/avraham-cohen` — כי אחסון סטטי (GitHub Pages) לא יכול לפענח
בזמן אמת נתיב שנוצר אחרי הפרסום (כל דף הנצחה שנוצר ע"י משתמש). כתובת ה-slug
עצמה מתועתקת אוטומטית לאנגלית (`אברהם כהן` → `avraham-cohen`) — גם כדי
שתהיה תקינה בברקוד/שיתוף ב-WhatsApp, וגם כי מנוע חוקי האבטחה של Firestore לא
מסתדר טוב עם ID של מסמך שמכיל עברית. השם בעברית כמובן מוצג במלואו בתוך הדף.

## מבנה הפרויקט

- `src/lib/firebase.ts` — אתחול Firebase client SDK (Auth + Firestore).
- `src/lib/cloudinary.ts` — העלאת קבצים (unsigned upload) ל-Cloudinary.
- `src/lib/credits.ts` — קריאת/מעקב יתרת קרדיטים, וקריאה ל-Worker ליצירת דף
  ולרכישת קרדיטים.
- `src/lib/use-auth.ts` — hook להתחברות/התנתקות עם Google.
- `src/lib/memorials.ts` — פעולות ה-CRUD מול Firestore + Cloudinary (עריכה,
  מחיקה, העלאת תמונות/הקלטה — הכל חוץ מיצירה, שעוברת דרך ה-Worker).
- `src/lib/hebrew-date.ts` — המרת תאריכים לועזי/עברי וחישוב יום השנה הבא
  (יארצייט) באמצעות [`@hebcal/core`](https://github.com/hebcal/hebcal-es6).
- `src/components/memorial/` — כל הרכיבים של דף ההנצחה הציבורי (תעודת זהות,
  סיפור חיים, מדיה, תהילים, יום השנה, מצבה, שיתוף זיכרון, שיתוף, ברקוד).
- `src/app/` — הדפים: `/` (נחיתה), `/dashboard` (הדפים שלי), `/create`
  (יצירת דף), `/credits` (רכישת קרדיטים), `/memorial` (דף הנצחה ציבורי,
  `?slug=`), `/memorial/edit`.
- `firestore.rules`, `firestore.indexes.json` — חוקי אבטחה ואינדקסים ל-Firestore.
- `worker/` — ה-Cloudflare Worker (ראו `worker/README.md`).
- `.github/workflows/deploy.yml` — בנייה ופרסום האתר ל-GitHub Pages.
- `.github/workflows/deploy-worker.yml` — פרסום ה-Worker ל-Cloudflare.

## תכונות עיקריות

- התחברות עם Google, ולכל משתמש דף "הדפים שלי" עם כל דפי ההנצחה שיצר, ויתרת
  קרדיטים גלויה בכל עמוד.
- יצירת דף עולה 5 קרדיטים (קרדיט = 1 ₪), נרכשים דרך PayPal בעמוד `/credits`;
  עריכת דף קיים תמיד חינמית; מחיקת דף אינה מזכה בקרדיטים בחזרה (מוצג באזהרה
  ברורה לפני אישור מחיקה).
- טופס יצירה/עריכה מלא: שם, הורים, בן/בת זוג, ילדים, עיסוק, תאריכים, מקום
  קבורה, סיפור חיים (+ הקלטת קול אופציונלית), קישור לסרטון, תמונה ראשית,
  גלריית תמונות, תמונת מצבה וקישור ניווט אליה.
- דף הנצחה ציבורי מעוצב עם ניווט עוגן (ראשי / מי אני / תהילים / מדיה / שיתוף
  זיכרון), תעודת זהות, תאריך עברי מחושב אוטומטית, יום השנה הבא + ספירה לאחור
  + הוספה ליומן (ICS) + שיתוף ב-WhatsApp, תמונת מצבה עם ניווט, וכפתורי שיתוף
  לרשתות.
- **שיתוף זיכרון**: תוסף אופציונלי לכל דף (לא כלול ביצירה) — כל מי שמכיר/ה את
  היקיר/ה יכול/ה לכתוב זיכרון ולצרף עד 4 תמונות, בלי הגבלה וללא תשלום מצדם.
  הפעלת האפשרות הזו על דף קיים היא תשלום נפרד, חד-פעמי לדף, בעלות 2 קרדיטים
  — נקבע ונאכף רק דרך ה-Worker, בדיוק כמו יצירת דף.
- ברקוד (QR) מעוצב וניתן להתאמה אישית לכל דף — כולל אפשרות להטביע בתוכו תמונה
  (התמונה הראשית של הדף, או תמונה אחרת שמעלים). ניתן להורדה כ-PNG להדפסה על
  המצבה — מוצג לבעל/ת הדף בלבד.

## פיתוח מקומי (רק אם תרצו לשנות קוד)

לא נדרש כדי שהאתר יעבוד בפרודקשן — זה רק אם תרצו לערוך את הקוד ולבדוק שינויים
לפני שדוחפים אותם.

```bash
cp .env.example .env
# ערכו את .env והדביקו את פרטי ה-config (או הפעילו אמולטורים, ראו למטה)
npm install
npm run dev
```

האתר ירוץ בכתובת `http://localhost:3000/zikaron`.

לפיתוח בלי לגעת בפרויקט ה-Firebase האמיתי, אפשר להריץ מול
[Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
(Auth + Firestore בלבד — אין אמולטור ל-Cloudinary):

```bash
firebase emulators:start --only auth,firestore
```

ואז ב-`.env` הגדירו `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"` (יש לבנות
מחדש לאחר שינוי משתני `NEXT_PUBLIC_*`, כיוון שהם מוטמעים ב-build).

להרצת ה-Worker מקומית: ראו [`worker/README.md`](./worker/README.md).

כדי לבדוק את קובצי הפלט הסטטיים בדיוק כמו שהם ייראו ב-GitHub Pages (במקום
`next dev`): `npm run build && npm run preview`.
