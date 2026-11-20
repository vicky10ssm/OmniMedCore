// Referrer display rules for the doctors/hospitals catalogue.
//
// A single formatter keeps billing, the catalogue and printed documents from
// adding "Dr." to a hospital or self entry. Type values are normalised because
// older/imported rows may have different casing or surrounding whitespace.

export type ReferrerType = "doctor" | "hospital" | "self";

export function normalizeReferrerType(type: string | null | undefined): ReferrerType {
  const value = String(type ?? "").trim().toLowerCase();
  if (value === "hospital") return "hospital";
  if (value === "self") return "self";
  return "doctor";
}

export function referrerLabel(doctor: {
  name: string;
  type?: string | null;
} | null | undefined): string {
  if (!doctor) return "Self / walk-in";
  switch (normalizeReferrerType(doctor.type)) {
    case "hospital":
      return doctor.name;
    case "self":
      return "Self / walk-in";
    default:
      return `Dr. ${doctor.name}`;
  }
}

export function referrerOptionLabel(doctor: {
  name: string;
  type?: string | null;
  specialization?: string | null;
}): string {
  switch (normalizeReferrerType(doctor.type)) {
    case "hospital":
      return `${doctor.name} (Hospital)`;
    case "self":
      return "Self / walk-in";
    default:
      return `Dr. ${doctor.name}${
        doctor.specialization ? ` (${doctor.specialization})` : ""
      }`;
  }
}
