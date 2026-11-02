// Clinic logo ingestion. The logo is stored as a data URL in tenant settings.
// Keep files small so the local database, backups and print jobs stay lean.

export const LOGO_MAX_BYTES = 500 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateLogoFile(file: File): string {
  if (!ACCEPTED.has(file.type)) {
    return "Choose a PNG, JPG or WebP image.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo must be 500 KB or smaller. Resize it before uploading.";
  }
  return "";
}

export function readLogoFile(file: File): Promise<string> {
  const error = validateLogoFile(file);
  if (error) return Promise.reject(new Error(error));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the logo file."));
    reader.readAsDataURL(file);
  });
}
