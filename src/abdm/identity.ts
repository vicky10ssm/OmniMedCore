// Local ABHA identifier handling.
//
// This validates *format only*. It never claims that an ABHA number/address was
// verified with ABDM. Verification requires the official API and is deliberately
// not simulated.

export type AbhaIdentifierKind = "number" | "address" | "unknown";

export interface AbhaIdentifier {
  valid: boolean;
  kind: AbhaIdentifierKind;
  normalized: string;
  error: string;
}

export function inspectAbhaIdentifier(raw: string): AbhaIdentifier {
  const value = raw.trim();
  if (!value) return { valid: true, kind: "unknown", normalized: "", error: "" };

  if (value.includes("@")) {
    // ABHA address (PHR address), e.g. name@sbx or name@abdm.
    const valid = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}@[A-Za-z0-9.-]{2,64}$/.test(value);
    return {
      valid,
      kind: "address",
      normalized: value.toLowerCase(),
      error: valid
        ? ""
        : "ABHA address should look like name@abdm, using letters, numbers, dot, underscore or hyphen.",
    };
  }

  const digits = value.replace(/[\s-]/g, "");
  const valid = /^\d{14}$/.test(digits);
  return {
    valid,
    kind: "number",
    normalized: valid
      ? `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`
      : digits,
    error: valid ? "" : "ABHA number should contain 14 digits.",
  };
}

/** Local namespace used when a patient has no ABHA identifier. */
export function localPatientIdentifier(tenantId: string, patientId: string) {
  return {
    system: `urn:diagbill:${tenantId}:patient`,
    value: patientId,
  };
}
