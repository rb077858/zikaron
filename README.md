# זיכרון — דפי הנצחה דיגיטליים

מערכת ליצירת דפי הנצחה דיגיטליים: התחברות עם **חשבון reem.bi**
(login.reembir.com — סיסמה, Google או קישור במייל), יצירת דף הנצחה מלא (פרטים,
תמונות, סיפור חיים, יום השנה הבא לפי הלוח העברי) וקבלת קישור + ברקוד
להדבקה על המצבה. כמה דפים אפשר ליצור, והאם שיתוף זיכרון כלול, נקבע לפי
התוכנית של המשתמש בדשבורד של reem.bi. אין תשלום באתר: מי שרוצה לשדרג פונה
ישירות, והשדרוג נעשה בדשבורד. עריכת דף קיים תמיד חינמית.

**אין כאן שרת להריץ בעצמכם, ותפעול האתר חינמי לגמרי.** האתר עצמו הוא קובצי
HTML/JS סטטיים, שמתארחים ב-GitHub Pages תחת `zikaron.reembir.com` (חינם).
ההתחברות היא דרך reem.bi, שמנפיק לדפדפן גם טוקן ל-Firebase, ומסד הנתונים רץ
ישירות מהדפדפן מול **Firestore** (חינמי בתוכנית ה-Spark, בלי כרטיס אשראי).
קבצים (תמונות, הקלטות) מועלים ל-**Cloudinary** במקום ל-Firebase Storage (שדורש
שדרוג בתשלום גם לשימוש זעיר). יצירת דף והפעלת שיתוף זיכרון עוברות דרך
פונקציית **Cloudflare Worker** קטנה וחינמית, שמאמתת את המשתמש מול reem.bi
ואוכפת את מגבלות התוכנית שלו בצד מהימן (לא בדפדפן, שאפשר לעקוף). אחרי
ההגדרה החד-פעמית למטה, כל עדכון לאתר הוא סתם `git push`: GitHub Actions בונה
ומפרסם הכל אוטומטית.

## הגדרה חד-פעמית

ארבעה חלקים, כולם דרך דפדפן — כמעט ולא צריך טרמינל (יוצא דופן אחד מסומן למטה).

### 1. פרויקט Firebase (חינם, בלי כרטיס אשראי)

1. צרו פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com).
   השאירו אותו בתוכנית **Spark** (החינמית) — אין צורך לשדרג ל-Blaze בכלל.
2. **Authentication** → Get started (צריך רק שיהיה מופעל; ההתחברות עצמה היא
   דרך reem.bi עם custom token, כך שאין ספק שצריך להפעיל).
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
   האבטחה (בדיוק כמו Admin SDK). את אותו קובץ JSON צריך גם reem.bi, כדי
   להנפיק טוקן Firebase לפרויקט הזה (ראו "התחברות עם reem.bi" למטה).
   **שמרו את הקובץ הזה בסודיות** ואל תעלו אותו לשום מקום.

### 2. חשבון Cloudinary (חינם, בלי כרטיס אשראי) — לתמונות והקלטות

1. הרשמו בחינם ב-[cloudinary.com](https://cloudinary.com).
2. בדף הבית של ה-Dashboard, העתיקו את ה-**Cloud name**.
3. Settings (גלגל השיניים) → Upload → Upload presets → **Add upload preset**.
   שנו את **Signing Mode** ל-**Unsigned**, שמרו, והעתיקו את שם ה-preset.

### 3. Cloudflare Worker: יצירת דפים ומגבלות התוכנית

זהו החלק שאוכף את מגבלות התוכנית (כמה דפים, שיתוף זיכרון). לא ניתן לעשות
זאת בבטחה מהדפדפן בלבד, כי מישהו טכני יכול פשוט לעקוף בדיקה שרצה בצד לקוח.

1. **Cloudflare**: הרשמו בחינם ב-[cloudflare.com](https://dash.cloudflare.com/sign-up)
   (לא נדרש כרטיס אשראי לתוכנית החינמית של Workers). מה-Dashboard העתיקו את
   ה-**Account ID** (מופיע בסרגל הימני של כל דומיין/של Workers & Pages).
2. צרו **API Token**: My Profile → API Tokens → Create Token → תבנית "Edit
   Cloudflare Workers" מספיקה. העתיקו את הטוקן.
3. בריפו הזה, **Settings → Secrets and variables → Actions → New repository
   secret**, הוסיפו:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` (מהקובץ JSON משלב 1, שדה `client_email`)
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (מהקובץ JSON, שדה `private_key`
     כולל `-----BEGIN PRIVATE KEY-----` ו-`\n`, בדיוק כפי שהוא)
4. ב-[`worker/wrangler.toml`](./worker/wrangler.toml) יש ערכים לא-סודיים:
   - `FIREBASE_PROJECT_ID`: ה-Project ID מ-Firebase
   - `ALLOWED_ORIGIN`: הדומיין המדויק שהאתר מתארח בו (למשל
     `https://zikaron.reembir.com`). חייב להתאים בדיוק לכתובת בשורת
     הכתובת של הדפדפן, אחרת בקשות ה-API מהאתר ל-Worker ייחסמו (CORS)
   - `REEM_AUTH_ORIGIN` / `REEM_CLIENT_ID`: שרת reem.bi והמזהה של האתר בו
     (`zikaron`)
5. דחיפה ל-`main` מריצה את
   [`.github/workflows/deploy-worker.yml`](./.github/workflows/deploy-worker.yml)
   שמפרסם את ה-Worker אוטומטית ל-`https://zikaron-worker.<your-subdomain>.workers.dev`.
   את הכתובת הזו רואים בלוג של ה-Action, או ב-Cloudflare Dashboard תחת
   Workers & Pages.
6. **הרשאה נוספת ל-Service Account** (להעברת נתונים ישנים, ראו למטה):
   [Google Cloud Console](https://console.cloud.google.com/iam-admin/iam) →
   בחרו את פרויקט ה-Firebase → מצאו את ה-Service Account (המייל
   מ-`GOOGLE_SERVICE_ACCOUNT_EMAIL`) → **Edit** → **Add another role** →
   **Firebase Authentication Admin**.

### 4. חיבור האתר עצמו ל-GitHub Pages

1. באותו מקום (**Settings → Secrets and variables → Actions**), הוסיפו גם:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   - `NEXT_PUBLIC_WORKER_URL` — הכתובת מסעיף 3.5 למעלה
2. **Settings → Pages** → תחת Build and deployment → Source, בחרו
   **GitHub Actions**.
3. מזגו את הענף הזה ל-`main` (או פשוט דחפו אליו) — ה-workflow
   [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ירוץ
   אוטומטית, יבנה את האתר ויפרסם אותו.
4. האתר מוגש מתת-הדומיין הייעודי שלו `zikaron.reembir.com` (לא תחת נתיב
   כמו `reembir.com/zikaron`). כדי שזה יעבוד צריך:
   - רשומת DNS מסוג `CNAME` אצל ספק הדומיין: `zikaron` → `<your-username>.github.io`.
   - **Settings → Pages → Custom domain** בריפו **הזה** (לא בריפו של עמוד
     המשתמש) — הזינו `zikaron.reembir.com` ואשרו.

   כתובת `NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_BASE_PATH` למעלה כבר מוגדרות
   לתת-דומיין הזה (בלי נתיב `/zikaron` בסוף) — אם תעברו לכתובת אחרת יש לעדכן
   גם אותן וגם את `ALLOWED_ORIGIN` ב-`worker/wrangler.toml` (שלב 3.4) כך
   שתמיד יתאימו בדיוק לכתובת שבשורת הדפדפן.

**זהו.** מעכשיו, כל `git push` ל-`main` מפרסם גרסה מעודכנת אוטומטית של האתר
ושל ה-Worker כאחד — אין צורך להריץ שום דבר בעצמכם.

## התחברות עם reem.bi, תוכניות וניהול

ההתחברות, החסימה והשדרוגים מנוהלים כולם בדשבורד של reem.bi
(login.reembir.com/admin), תחת האתר `zikaron`. באתר עצמו אין עמוד ניהול.

- **מי נכנס / חסימה**: בהגדרות הגישה של האתר ובמשתמשים בדשבורד. משתמש
  שהגישה שלו נחסמה לא יכול ליצור דפים (ה-Worker מקבל 403 מ-reem.bi), והאתר
  מנתק אותו גם מ-Firebase ברגע ש-reem.bi מדווח שהוא לא מחובר.
- **תוכניות**: ההרשאות מגיעות ב-`features` של התוכנית (או הרשאות אישיות
  למשתמש), ונבדקות ב-Worker:

  | שדה | סוג | ברירת מחדל | משמעות |
  |---|---|---|---|
  | `max_memorials` | מספר | `1` | כמה דפי הנצחה המשתמש יכול להחזיק |
  | `memory_wall` | בוליאני | `false` | אפשר להפעיל "שיתוף זיכרון" בדפים שלו |
  | `unlimited` | בוליאני | `false` | בלי שום מגבלה (מחליף את המנהל הקבוע הישן) |

- **שדרוג**: אין תשלום באתר. העמוד `/upgrade` מציג את החבילה הנוכחית ומפנה
  לפנייה במייל (`CONTACT_EMAIL` ב-`src/lib/worker-api.ts`), ואת השדרוג עצמו
  עושים בדשבורד.
- **טוקן Firebase**: reem.bi מנפיק לדפדפן custom token לפרויקט ה-Firebase של
  האתר (uid = מזהה המשתמש ב-reem.bi, עם `sso_email` ב-claims). לשם כך
  reem.bi צריך את קובץ ה-JSON של ה-Service Account (שלב 1.6) כסוד ב-Cloudflare
  של reem.bi.
- **נתונים מלפני המעבר**: דפים וקרדיטים שנוצרו עם ההתחברות הישנה (Google דרך
  Firebase) שמורים תחת ה-uid הישן. בכניסה הראשונה עם reem.bi, ה-Worker מוצא
  את החשבון הישן לפי המייל ומעביר אליו את כל הדפים (כולל תמונות וזיכרונות)
  ואת יתרת הקרדיטים. יתרת קרדיטים ישנה עדיין שמישה: אחרי שנגמרת המכסה של
  התוכנית, דף נוסף מנכה 5 קרדיטים ושיתוף זיכרון מנכה 2, כמו קודם. קרדיטים
  חדשים כבר לא נמכרים.

## איך זה עובד מתחת למכסה

- **Next.js** (App Router) בנוי במצב `output: "export"` — כלומר `next build`
  מפיק תיקיית `out/` עם קבצי HTML/CSS/JS סטטיים בלבד, בלי שרת Node.js בכלל.
- **reem.bi** — ההתחברות (ספריית `sdk.js` מ-login.reembir.com, ראו
  `src/lib/use-auth.ts`). אחרי ההתחברות הדפדפן נכנס ל-Firebase עם custom
  token מ-reem.bi.
- **Firestore** — מסד הנתונים, חינמי במלואו בתוכנית Spark.
- **Cloudinary** — אחסון קבצים (תמונות, הקלטת סיפור חיים) דרך unsigned upload
  preset, ישירות מהדפדפן. חינמי, בלי כרטיס אשראי, בניגוד ל-Firebase Storage.
- **Cloudflare Worker** (`worker/`) — הגורם המהימן היחיד שמותר לו ליצור דף
  הנצחה, להפעיל שיתוף זיכרון או לשנות יתרת קרדיטים (`firestore.rules` חוסם
  את אלה ישירות מהדפדפן). כל בקשה מאומתת מול
  `https://login.reembir.com/api/userinfo` עם הטוקן של המשתמש, ורק אז נבדקות
  מגבלות התוכנית (`features`), והכתיבה נעשית בפעולה אטומית אחת. גישתו
  ל-Firestore היא כ-Service Account (כמו Admin SDK), ולכן אינה כפופה לחוקי
  האבטחה של הדפדפן.
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
- `src/lib/use-auth.ts` — ההתחברות עם reem.bi: טעינת ה-SDK, מצב המשתמש,
  וכניסה ל-Firebase עם custom token.
- `src/lib/cloudinary.ts` — העלאת קבצים (unsigned upload) ל-Cloudinary.
- `src/lib/worker-api.ts` — קריאות ל-Worker (מצב החבילה, יצירת דף, הפעלת
  שיתוף זיכרון) וכתובת הפנייה לשדרוג.
- `src/lib/memorials.ts` — פעולות ה-CRUD מול Firestore + Cloudinary (עריכה,
  מחיקה, העלאת תמונות/הקלטה — הכל חוץ מיצירה, שעוברת דרך ה-Worker).
- `src/lib/hebrew-date.ts` — המרת תאריכים לועזי/עברי וחישוב יום השנה הבא
  (יארצייט) באמצעות [`@hebcal/core`](https://github.com/hebcal/hebcal-es6).
- `src/components/memorial/` — כל הרכיבים של דף ההנצחה הציבורי (תעודת זהות,
  סיפור חיים, מדיה, תהילים, יום השנה, מצבה, שיתוף זיכרון, שיתוף, ברקוד).
- `src/app/` — הדפים: `/` (נחיתה), `/dashboard` (הדפים שלי), `/create`
  (יצירת דף), `/upgrade` (החבילה שלי ושדרוג), `/memorial` (דף הנצחה ציבורי,
  `?slug=`), `/memorial/edit`.
- `firestore.rules` — חוקי אבטחה ל-Firestore (חובה להעתיק ל-Console בכל שינוי, ראו
  שלב 1 למעלה). `firestore.indexes.json` ריק בכוונה — כל השאילתות בנויות כך
  שלא דורשות אינדקס מורכב (מיון נעשה בצד הלקוח), כדי לא להסתמך על אינדקס
  שאף אחד לא באמת יצר ב-Firebase Console.
- `worker/` — ה-Cloudflare Worker (ראו `worker/README.md`).
- `.github/workflows/deploy.yml` — בנייה ופרסום האתר ל-GitHub Pages.
- `.github/workflows/deploy-worker.yml` — פרסום ה-Worker ל-Cloudflare.

## תכונות עיקריות

- התחברות עם חשבון reem.bi, ולכל משתמש דף "הדפים שלי" עם כל דפי ההנצחה שיצר.
- כמות הדפים לפי התוכנית בדשבורד של reem.bi; עריכת דף קיים תמיד חינמית;
  מחיקת דף היא לצמיתות (מוצג באזהרה ברורה לפני אישור מחיקה).
- טופס יצירה/עריכה מלא: שם, הורים, בן/בת זוג, ילדים, עיסוק, תאריכים, מקום
  קבורה, סיפור חיים (+ הקלטת קול אופציונלית), קישור לסרטון, תמונה ראשית,
  גלריית תמונות, תמונת מצבה וקישור ניווט אליה.
- דף הנצחה ציבורי מעוצב עם ניווט עוגן (ראשי / מי אני / תהילים / מדיה / שיתוף
  זיכרון), תעודת זהות, תאריך עברי מחושב אוטומטית, יום השנה הבא + ספירה לאחור
  + הוספה ליומן (ICS) + שיתוף ב-WhatsApp, תמונת מצבה עם ניווט, וכפתורי שיתוף
  לרשתות.
- **שיתוף זיכרון**: תוסף אופציונלי לכל דף (לא כלול ביצירה). כל מי שמכיר/ה את
  היקיר/ה יכול/ה לכתוב זיכרון ולצרף עד 4 תמונות, בלי הגבלה וללא תשלום מצדם.
  ההפעלה אפשרית רק אם התוכנית כוללת `memory_wall`, ונאכפת רק דרך ה-Worker,
  בדיוק כמו יצירת דף. ניתן גם להסיר את האפשרות בכל שלב (ישירות מהדף). הזיכרונות
  שכבר שותפו נשמרים אך לא מוצגים. בעל/ת הדף יכול/ה למחוק כל
  זיכרון בנפרד (למשל תוכן לא ראוי), וגם להסיר או להחליף את התמונה הראשית
  ותמונת המצבה בכל עת מעמוד העריכה.
- ברקוד (QR) מעוצב לכל דף, וניתן להפוך אותו לברקוד שבנוי מהתמונה עצמה —
  לא לוגו קטן שמוטבע בתוכו, אלא הברקוד כולו (התמונה הראשית של הדף, או כל
  תמונה אחרת שמעלים) בטכניקת מוזאיקה שנשארת סרוקה במלואה (נבדק אוטומטית
  מול מפענח QR). ניתן להורדה כ-PNG להדפסה על המצבה — מוצג לבעל/ת הדף בלבד.

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
