import { createImageUpload } from "@/lib/actions";
import type { ImageFolder } from "@/lib/cloudinary";

/** Error messages, from messages/*.json `markdownEditor`. */
export interface UploadMessages {
  onlyImages: string;
  tooLarge: string;
  uploadFailed: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPTED_IMAGE_TYPES = ACCEPTED_TYPES.join(",");
/** Cloudinary's free plan rejects images over 10 MB. */
const MAX_BYTES = 10 * 1024 * 1024;

export function isUploadableImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/**
 * Cloudinary URL that serves the best format (AVIF/WebP) and quality for each
 * browser instead of the original file.
 */
function toDeliveryUrl(secureUrl: string): string {
  return secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}

/** Uploads one image from the browser straight to Cloudinary and returns its public URL. */
export async function uploadImage(
  file: File,
  folder: ImageFolder,
  messages: UploadMessages,
): Promise<string> {
  if (!isUploadableImage(file)) {
    throw new Error(messages.onlyImages);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(messages.tooLarge);
  }

  const upload = await createImageUpload(folder);
  if ("error" in upload) {
    throw new Error(upload.error);
  }

  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(upload.fields)) {
    body.append(key, value);
  }

  const response = await fetch(upload.uploadUrl, { method: "POST", body });
  const result = (await response.json().catch(() => null)) as {
    secure_url?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || !result?.secure_url) {
    throw new Error(result?.error?.message ?? messages.uploadFailed);
  }

  return toDeliveryUrl(result.secure_url);
}
