"use client";

import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";
import { subscribeToCredits, purchaseCreditsViaWorker, CREDITS_PER_MEMORIAL } from "@/lib/credits";

const PRESETS = [10, 25, 50, 100];
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

export default function CreditsPage() {
  const { user, loading } = useCurrentUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCredits(user.uid, setCredits);
    return () => unsub();
  }, [user]);

  const amount = customAmount ? Math.max(1, Math.floor(Number(customAmount) || 0)) : selected;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center text-muted">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="text-lg text-muted">כדי לרכוש קרדיטים יש להתחבר תחילה</p>
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            <GoogleIcon className="size-4" />
            התחברות עם Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <h1 className="mb-2 text-2xl font-bold text-gold-soft">רכישת קרדיטים</h1>
        <p className="mb-8 text-sm text-muted">
          כל קרדיט עולה 1 ₪. יצירת דף הנצחה עולה {CREDITS_PER_MEMORIAL} קרדיטים. עריכת דף קיים
          תמיד חינמית.
        </p>

        <div className="section-card mb-8 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted">היתרה שלכם</p>
          <p className="text-4xl font-extrabold text-gold-soft">
            {credits === null ? "…" : credits}
          </p>
        </div>

        <div className="section-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-gold-soft">בחרו כמות</h2>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setCustomAmount("");
                }}
                className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                  !customAmount && selected === p
                    ? "border-gold bg-gold/10 text-gold-soft"
                    : "border-border hover:border-gold/60"
                }`}
              >
                <div className="text-lg font-bold">{p}</div>
                <div className="text-xs text-muted">₪{p}</div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-muted">כמות מותאמת אישית</span>
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="לדוגמה: 15"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-gold focus:outline-none"
              />
            </label>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            סה&quot;כ לתשלום: <span className="font-bold text-foreground">₪{amount}</span> עבור{" "}
            <span className="font-bold text-foreground">{amount}</span> קרדיטים
          </p>

          <div className="mt-6">
            {!PAYPAL_CLIENT_ID ? (
              <p className="text-center text-sm text-red-400">
                תשלום עדיין לא הוגדר באתר זה (חסר NEXT_PUBLIC_PAYPAL_CLIENT_ID).
              </p>
            ) : (
              <PayPalScriptProvider
                options={{ clientId: PAYPAL_CLIENT_ID, currency: "ILS", intent: "capture" }}
              >
                <PayPalButtons
                  key={amount}
                  disabled={amount < 1 || status === "processing"}
                  style={{ layout: "vertical" }}
                  createOrder={(_data, actions) =>
                    actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [
                        {
                          amount: { value: String(amount), currency_code: "ILS" },
                          description: `${amount} קרדיטים לזיכרון`,
                        },
                      ],
                    })
                  }
                  onApprove={async (data) => {
                    setStatus("processing");
                    setStatusMessage(null);
                    try {
                      const idToken = await user.getIdToken();
                      // The Worker itself captures the order server-side and
                      // verifies the paid amount before crediting — we never
                      // capture client-side, since that step is exactly what
                      // proves the money actually moved.
                      await purchaseCreditsViaWorker(idToken, data.orderID, amount);
                      setStatus("success");
                      setStatusMessage(`נזקפו לכם ${amount} קרדיטים בהצלחה!`);
                    } catch (err) {
                      console.error(err);
                      setStatus("error");
                      setStatusMessage("התשלום התקבל אך זקיפת הקרדיטים נכשלה. פנו אלינו לבירור.");
                    }
                  }}
                  onError={(err) => {
                    console.error(err);
                    setStatus("error");
                    setStatusMessage("התשלום נכשל. נסו שוב.");
                  }}
                />
              </PayPalScriptProvider>
            )}
          </div>

          {statusMessage && (
            <p
              className={`mt-4 text-center text-sm ${
                status === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
