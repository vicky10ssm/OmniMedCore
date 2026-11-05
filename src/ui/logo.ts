// Image ingestion for the clinic logo and radiologist signatures.
// Images are stored as data URLs in tenant-scoped rows. Keep files small so
// the local database, backups and print jobs stay lean.

export const IMAGE_MAX_BYTES = 500 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateImageFile(file: File, label = "Image"): string {
  if (!ACCEPTED.has(file.type)) {
    return `Choose a PNG, JPG or WebP ${label.toLowerCase()}.`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `${label} must be 500 KB or smaller. Resize it before uploading.`;
  }
  return "";
}

export function readImageFile(file: File, label = "Image"): Promise<string> {
  const error = validateImageFile(file, label);
  if (error) return Promise.reject(new Error(error));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Could not read the ${label.toLowerCase()} file.`));
    reader.readAsDataURL(file);
  });
}

// Backwards-compatible logo helpers used by the existing branding screen.
export const LOGO_MAX_BYTES = IMAGE_MAX_BYTES;

export function validateLogoFile(file: File): string {
  return validateImageFile(file, "Logo");
}

export function readLogoFile(file: File): Promise<string> {
  return readImageFile(file, "Logo");
}
