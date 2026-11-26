import "server-only";

import { createHash } from "node:crypto";

/** Everything the browser needs for one signed upload straight to Cloudinary. */
export interface SignedImageUpload {
  uploadUrl: string;
  /** Sent as multipart form fields next to `file`. */
  fields: Record<string, string>;
}

/** Cloudinary folders an upload may go to. The browser picks one, and the signature pins it. */
export const IMAGE_FOLDERS = ["blog", "lessons"] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

/** Stored images are capped at this width/height (larger uploads are scaled down on Cloudinary). */
const MAX_IMAGE_SIZE = 2000;

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  return { cloudName, apiKey, apiSecret };
}

/**
 * Signs upload parameters per https://cloudinary.com/documentation/authentication_signatures:
 * every param except file/api_key/resource_type, sorted, joined as a query string, plus the
 * secret, SHA-1. The signature stays valid for one hour, and the browser can't change the
 * signed params (folder, allowed formats, size cap). Returns null when env vars are missing.
 */
export function signImageUpload(folder: ImageFolder): SignedImageUpload | null {
  const config = getConfig();
  if (!config) {
    return null;
  }

  const params: Record<string, string> = {
    allowed_formats: "jpg,jpeg,png,webp,gif",
    folder,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: `c_limit,w_${MAX_IMAGE_SIZE},h_${MAX_IMAGE_SIZE}`,
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + config.apiSecret)
    .digest("hex");

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    fields: { ...params, api_key: config.apiKey, signature },
  };
}
