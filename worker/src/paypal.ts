/**
 * Captures a PayPal order server-side and returns the verified, actually-
 * captured amount. The browser only ever *creates* the order and gets the
 * buyer's approval — capturing here (using the secret client credentials,
 * never exposed to the browser) is what proves the money really moved
 * before we credit anyone's account.
 */
export async function capturePayPalOrder(
  orderID: string,
  clientId: string,
  clientSecret: string,
  apiBase: string
): Promise<{ amount: number; currency: string }> {
  const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) {
    throw new Error(`PayPal auth failed: ${await tokenRes.text()}`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

  const captureRes = await fetch(`${apiBase}/v2/checkout/orders/${orderID}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await captureRes.json()) as {
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ status: string; amount: { value: string; currency_code: string } }> };
    }>;
  };

  if (!captureRes.ok) {
    throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (data.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    throw new Error(`PayPal order not completed: ${JSON.stringify(data)}`);
  }

  return { amount: Number(capture.amount.value), currency: capture.amount.currency_code };
}
