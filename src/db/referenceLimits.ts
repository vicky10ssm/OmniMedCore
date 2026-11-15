// Derives numeric reference limits from the displayed reference text.
//
// The catalogue stores both a printable reference string and optional numeric
// limits. Older rows sometimes have the string but null limits, which disables
// Low/High flags. This parser supplies missing limits without overwriting
// explicit ones. It is intentionally conservative:
// - age bands such as "children 1-5y" are ignored
// - sex/age variants are combined into the broadest range
// - one-sided ranges such as "<150" or ">90" keep the open side null
// - a reference that is exactly zero becomes 0-0 (e.g. malaria density)
// - method-specific/qualitative text returns null

export interface DerivedReferenceLimits {
  refMin: number | null;
  refMax: number | null;
}

const RANGE_RE =
  /([+-]?\d+(?:\.\d+)?)\s*(?:-|to)\s*([+]?\d+(?:\.\d+)?)/gi;
const UPPER_RE = /(?:<=|<)\s*([+-]?\d+(?:\.\d+)?)/g;
const LOWER_RE = /(?:>=|>)\s*([+-]?\d+(?:\.\d+)?)/g;

function isAgeBand(text: string, endIndex: number): boolean {
  const after = text.slice(endIndex).trimStart();
  return /^(y|yr|yrs|year|years)\b/i.test(after);
}

export function deriveReferenceLimits(
  refRange: string
): DerivedReferenceLimits | null {
  const text = String(refRange || "")
    .replace(/,/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const ranges: { min: number; max: number }[] = [];
  let match: RegExpExecArray | null;
  RANGE_RE.lastIndex = 0;
  while ((match = RANGE_RE.exec(text))) {
    if (isAgeBand(text, match.index + match[0].length)) continue;
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
      ranges.push({ min, max });
    }
  }
  if (ranges.length > 0) {
    return {
      refMin: Math.min(...ranges.map((range) => range.min)),
      refMax: Math.max(...ranges.map((range) => range.max)),
    };
  }

  const upperBounds: number[] = [];
  UPPER_RE.lastIndex = 0;
  while ((match = UPPER_RE.exec(text))) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) upperBounds.push(value);
  }
  const lowerBounds: number[] = [];
  LOWER_RE.lastIndex = 0;
  while ((match = LOWER_RE.exec(text))) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) lowerBounds.push(value);
  }

  if (upperBounds.length > 0 && lowerBounds.length > 0) {
    return {
      refMin: Math.min(...lowerBounds),
      refMax: Math.max(...upperBounds),
    };
  }
  if (upperBounds.length > 0) {
    return { refMin: null, refMax: Math.max(...upperBounds) };
  }
  if (lowerBounds.length > 0) {
    return { refMin: Math.min(...lowerBounds), refMax: null };
  }

  // A purely zero reference (0%, 0/uL, "0 cells") means "not detected".
  if (!/[1-9]/.test(text) && /(^|\s)0(?:\s|%|\/|$)/.test(text)) {
    return { refMin: 0, refMax: 0 };
  }

  return null;
}
