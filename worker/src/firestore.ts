// Minimal Firestore REST API v1 client. Cloudflare Workers can't use
// firebase-admin (its Firestore client needs gRPC/Node APIs unavailable in
// the Workers runtime), so this talks to Firestore over plain HTTPS instead
// — the same API the Admin SDK uses under the hood.

export type FSValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string };

export function fsString(v: string): FSValue {
  return { stringValue: v };
}
export function fsInt(v: number): FSValue {
  return { integerValue: String(Math.trunc(v)) };
}
export function fsBool(v: boolean): FSValue {
  return { booleanValue: v };
}
export function fsNull(): FSValue {
  return { nullValue: null };
}
export function fsTimestamp(date: Date): FSValue {
  return { timestampValue: date.toISOString() };
}

export function fsFields(obj: Record<string, FSValue>) {
  return { fields: obj };
}

function parseValue(v: Record<string, unknown>): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("doubleValue" in v) return v.doubleValue;
  return undefined;
}

export function parseFields(fields: Record<string, Record<string, unknown>> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    out[k] = parseValue(v);
  }
  return out;
}

type GetResult =
  | { exists: true; updateTime: string; fields: Record<string, unknown> }
  | { exists: false };

export type FirestoreWrite = {
  updatePath: string;
  fields: Record<string, FSValue>;
  precondition?: { exists: boolean } | { updateTime: string };
};

export class FirestoreClient {
  private base: string;

  constructor(
    private projectId: string,
    private accessToken: string
  ) {
    this.base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  private docName(path: string): string {
    return `projects/${this.projectId}/databases/(default)/documents/${path}`;
  }

  async get(path: string): Promise<GetResult> {
    const res = await fetch(`${this.base}/${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 404) return { exists: false };
    if (!res.ok) {
      throw new Error(`Firestore GET ${path} failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      updateTime: string;
      fields?: Record<string, Record<string, unknown>>;
    };
    return { exists: true, updateTime: data.updateTime, fields: parseFields(data.fields) };
  }

  /**
   * Commits one or more writes atomically. Each write can carry a
   * `currentDocument` precondition (exists / updateTime) for optimistic
   * concurrency — if any precondition fails, the WHOLE commit is rejected
   * with FAILED_PRECONDITION and nothing is written.
   */
  async commit(writes: FirestoreWrite[]): Promise<void> {
    const body = {
      writes: writes.map((w) => ({
        update: { name: this.docName(w.updatePath), fields: w.fields },
        currentDocument: w.precondition,
      })),
    };

    const res = await fetch(`${this.base}:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      let status = "";
      try {
        status = (JSON.parse(errBody)?.error?.status as string) || "";
      } catch {
        // ignore
      }
      const err = new Error(`Firestore commit failed (${res.status}): ${errBody}`);
      (err as Error & { firestoreStatus?: string }).firestoreStatus = status;
      throw err;
    }
  }
}

export function isFailedPrecondition(err: unknown): boolean {
  return (
    err instanceof Error &&
    ((err as Error & { firestoreStatus?: string }).firestoreStatus === "FAILED_PRECONDITION" ||
      (err as Error & { firestoreStatus?: string }).firestoreStatus === "ALREADY_EXISTS")
  );
}
