import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type Memorial = {
  slug: string;
  ownerId: string;
  ownerEmail?: string | null;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  motherName?: string | null;
  spouseName?: string | null;
  childrenNames?: string | null;
  occupation?: string | null;
  burialPlace?: string | null;
  birthDate: string; // ISO date (yyyy-mm-dd)
  deathDate: string; // ISO date (yyyy-mm-dd)
  lifeStory?: string | null;
  lifeStoryAudioUrl?: string | null;
  videoUrl?: string | null;
  coverPhotoUrl?: string | null;
  graveImageUrl?: string | null;
  graveMapUrl?: string | null;
  tehilimChapter?: number | null;
  memoryWallEnabled?: boolean;
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Photo = {
  id: string;
  url: string;
  caption?: string | null;
  order: number;
};

export type Memory = {
  id: string;
  name: string;
  text?: string | null;
  photoUrls: string[];
  createdAt?: Timestamp;
};

/**
 * Firestore security rules can't reliably `get()` a parent document whose ID
 * contains Hebrew characters (our slugs), so ownership/visibility checks for
 * subcollection docs are done against fields copied onto the doc itself
 * instead of looking up the parent memorial.
 */
type Ownership = { ownerId: string; published: boolean };

export type MemorialFormInput = {
  firstName: string;
  lastName: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  childrenNames?: string;
  occupation?: string;
  burialPlace?: string;
  birthDate: string;
  deathDate: string;
  lifeStory?: string;
  videoUrl?: string;
  graveMapUrl?: string;
  tehilimChapter?: number;
};

// Memorial creation (slug generation, credit deduction, admin bypass) is
// handled entirely by the Cloudflare Worker now — see credits.ts's
// createMemorialViaWorker(). It can't be a direct client→Firestore write
// (firestore.rules denies it) since the client can't be trusted to actually
// pay before creating a page.

export async function updateMemorial(
  slug: string,
  fields: MemorialFormInput
): Promise<void> {
  await updateDoc(doc(db, "memorials", slug), {
    firstName: fields.firstName,
    lastName: fields.lastName,
    fatherName: fields.fatherName || null,
    motherName: fields.motherName || null,
    spouseName: fields.spouseName || null,
    childrenNames: fields.childrenNames || null,
    occupation: fields.occupation || null,
    burialPlace: fields.burialPlace || null,
    birthDate: fields.birthDate,
    deathDate: fields.deathDate,
    lifeStory: fields.lifeStory || null,
    videoUrl: fields.videoUrl || null,
    graveMapUrl: fields.graveMapUrl || null,
    tehilimChapter: typeof fields.tehilimChapter === "number" ? fields.tehilimChapter : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemorial(slug: string): Promise<void> {
  // Firestore rejects `list` queries outright unless a `where` filter lets it
  // prove the security rule holds without fetching each document — an
  // unfiltered collection read here would fail with permission-denied even
  // for the owner. Every doc is published, so this filter always matches.
  const photosSnap = await getDocs(
    query(collection(db, "memorials", slug, "photos"), where("published", "==", true))
  );
  const memoriesSnap = await getDocs(
    query(collection(db, "memorials", slug, "memories"), where("published", "==", true))
  );
  const batch = writeBatch(db);
  photosSnap.forEach((d) => batch.delete(d.ref));
  memoriesSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "memorials", slug));
  await batch.commit();
}

export async function getMemorialBySlug(slug: string): Promise<Memorial | null> {
  const snap = await getDoc(doc(db, "memorials", slug));
  if (!snap.exists()) return null;
  return snap.data() as Memorial;
}

export function subscribeToMemorial(
  slug: string,
  cb: (memorial: Memorial | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "memorials", slug), (snap) => {
    cb(snap.exists() ? (snap.data() as Memorial) : null);
  });
}

// Firestore validates security rules for `list` queries against the query's
// own filters (not per returned document), so a rule that reads
// `resource.data.published` requires a matching `where("published", ...)`
// filter on the query itself — otherwise Firestore rejects the whole query
// up front. Every memorial is published (there is no draft/unpublish
// feature), so this filter is always satisfied in practice.
export function subscribeToPhotos(
  slug: string,
  cb: (photos: Photo[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "memorials", slug, "photos"),
    where("published", "==", true),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Photo, "id">) })));
  });
}

export function subscribeToMemories(
  slug: string,
  cb: (memories: Memory[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "memorials", slug, "memories"),
    where("published", "==", true),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Memory, "id">) })));
  });
}

export async function getUserMemorials(ownerId: string): Promise<Memorial[]> {
  const q = query(
    collection(db, "memorials"),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Memorial);
}

export async function deletePhoto(slug: string, photoId: string): Promise<void> {
  await deleteDoc(doc(db, "memorials", slug, "photos", photoId));
}

export async function deleteMemory(slug: string, memoryId: string): Promise<void> {
  await deleteDoc(doc(db, "memorials", slug, "memories", memoryId));
}

async function uploadFile(slug: string, folder: string, file: File): Promise<string> {
  return uploadToCloudinary(file, `memorials/${slug}/${folder}`);
}

export async function uploadCoverPhoto(slug: string, file: File): Promise<void> {
  const url = await uploadFile(slug, "cover", file);
  await updateDoc(doc(db, "memorials", slug), { coverPhotoUrl: url, updatedAt: serverTimestamp() });
}

export async function uploadGraveImage(slug: string, file: File): Promise<void> {
  const url = await uploadFile(slug, "grave", file);
  await updateDoc(doc(db, "memorials", slug), { graveImageUrl: url, updatedAt: serverTimestamp() });
}

export async function uploadLifeStoryAudio(slug: string, file: File): Promise<void> {
  const url = await uploadFile(slug, "audio", file);
  await updateDoc(doc(db, "memorials", slug), { lifeStoryAudioUrl: url, updatedAt: serverTimestamp() });
}

export async function addGalleryPhotos(
  slug: string,
  files: File[],
  startOrder: number,
  ownership: Ownership
): Promise<void> {
  let order = startOrder;
  for (const file of files) {
    const url = await uploadFile(slug, "gallery", file);
    await addDoc(collection(db, "memorials", slug, "photos"), {
      url,
      caption: null,
      order: order++,
      ownerId: ownership.ownerId,
      published: ownership.published,
      createdAt: serverTimestamp(),
    });
  }
}

const MAX_MEMORY_PHOTOS = 4;

export async function addMemory(
  slug: string,
  name: string,
  text: string | undefined,
  photoFiles: File[],
  ownership: Ownership
): Promise<void> {
  const photoUrls: string[] = [];
  for (const file of photoFiles.slice(0, MAX_MEMORY_PHOTOS)) {
    photoUrls.push(await uploadFile(slug, "memories", file));
  }
  await addDoc(collection(db, "memorials", slug, "memories"), {
    name: name.trim().slice(0, 80),
    text: text?.trim() ? text.trim().slice(0, 1000) : null,
    photoUrls,
    ownerId: ownership.ownerId,
    published: ownership.published,
    memoryWallEnabled: true,
    createdAt: serverTimestamp(),
  });
}
