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
  /**
   * Firestore's `update` write REPLACES THE WHOLE DOCUMENT with just
   * `fields` unless an update mask is given — fine for a brand-new doc
   * (nothing else exists yet to lose), but silently destructive for a
   * partial update of an existing multi-field doc. Pass the field paths
   * being touched here whenever `fields` isn't the complete document.
   */
  updateMask?: string[];
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
   * Equality query on one field of a collection (single-field indexes are
   * automatic, so no composite index is needed). `parentPath` scopes it to
   * a subcollection; omit for a top-level collection.
   */
  async queryEqual(
    collectionId: string,
    fieldPath: string,
    value: FSValue,
    parentPath = ""
  ): Promise<Array<{ path: string; updateTime: string; fields: Record<string, unknown> }>> {
    const url = parentPath ? `${this.base}/${parentPath}:runQuery` : `${this.base}:runQuery`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where: { fieldFilter: { field: { fieldPath }, op: "EQUAL", value } },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Firestore query ${collectionId} failed (${res.status}): ${await res.text()}`);
    }
    const rows = (await res.json()) as Array<{
      document?: { name: string; updateTime: string; fields?: Record<string, Record<string, unknown>> };
    }>;
    const prefix = this.docName("");
    return rows
      .filter((r) => r.document)
      .map((r) => ({
        path: r.document!.name.slice(prefix.length),
        updateTime: r.document!.updateTime,
        fields: parseFields(r.document!.fields),
      }));
  }

  /** Paths of every document in a (sub)collection. */
  async listPaths(collectionPath: string): Promise<string[]> {
    const prefix = this.docName("");
    const out: string[] = [];
    let pageToken = "";
    do {
      const qs = new URLSearchParams({ pageSize: "300", "mask.fieldPaths": "ownerId" });
      if (pageToken) qs.set("pageToken", pageToken);
      const res = await fetch(`${this.base}/${collectionPath}?${qs}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Firestore list ${collectionPath} failed (${res.status}): ${await res.text()}`);
      }
      const data = (await res.json()) as { documents?: Array<{ name: string }>; nextPageToken?: string };
      for (const d of data.documents ?? []) out.push(d.name.slice(prefix.length));
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
    return out;
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
        updateMask: w.updateMask ? { fieldPaths: w.updateMask } : undefined,
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
