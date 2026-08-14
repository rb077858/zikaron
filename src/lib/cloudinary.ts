// File storage lives on Cloudinary instead of Firebase Storage: Firebase
// Storage requires the paid "Blaze" plan even for trivial usage, while
// Cloudinary's free tier (images, audio, video) needs no credit card and
// supports direct, unsigned uploads from the browser — no server involved.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
