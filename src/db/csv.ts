// CSV export helper.
//
// Excel on Indian Windows (and Google Sheets) both open UTF-8 CSVs correctly
// only when a BOM is present — without it, ₹ and accented names arrive mangled.
// We also prefix any value starting with =, +, - or @ with a single quote so
// Excel doesn't try to evaluate a payee or note as a formula.

/** Quotes one CSV field, escaping embedded quotes. */
function field(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  // Formula-injection guard (a supplier named "=cmd()" must stay text).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Builds a CSV string from a header row and data rows. */
export function toCsv(head: string[], rows: unknown[][]): string {
  return [head.map(field).join(","), ...rows.map((r) => r.map(field).join(","))].join(
    "\r\n"
  );
}

/** Triggers a download of the given CSV text as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  // \uFEFF is the BOM that makes Excel read the file as UTF-8.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convenience: build and download in one call. */
export function exportCsv(filename: string, head: string[], rows: unknown[][]): void {
  downloadCsv(filename, toCsv(head, rows));
}

/** Rupees as a plain 2-decimal string (no ₹, no thousands separators) for CSV. */
export function csvRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** yyyy-mm-dd for CSV (sortable, unambiguous). */
export function csvDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
