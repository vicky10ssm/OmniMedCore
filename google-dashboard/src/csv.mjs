// Strict RFC 4180 CSV reader for the OmniMed export contract.
//
// The export writes quoted fields for commas, quotes, CR/LF and leading
// apostrophes used as a formula-injection guard. This parser never evaluates
// cell content and never guesses at malformed input.

const FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);

export class CsvError extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "CsvError";
    this.line = line;
  }
}

/**
 * Removes the exporter's formula guard from a text cell.
 * Only a single leading apostrophe followed by a formula character is removed,
 * so ordinary values that happen to start with an apostrophe stay intact.
 */
export function unguardFormula(value) {
  if (value.length > 1 && value[0] === "'" && FORMULA_PREFIXES.has(value[1])) {
    return value.slice(1);
  }
  return value;
}

/**
 * @param {string} input
 * @param {{ maxColumns?: number, maxFieldChars?: number }} [limits]
 * @returns {string[][]}
 */
export function parseCsv(input, limits = {}) {
  const maxColumns = limits.maxColumns ?? 512;
  const maxFieldChars = limits.maxFieldChars ?? 1_000_000;
  const text = input.replace(/^\uFEFF/, "");
  if (text.includes("\u0000")) {
    throw new CsvError("CSV contains a NUL byte");
  }

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let justClosedQuote = false;
  let fieldStarted = false;
  let line = 1;
  let quoteLine = 1;

  const pushField = () => {
    if (field.length > maxFieldChars) {
      throw new CsvError("CSV field is too large", line);
    }
    row.push(field);
    if (row.length > maxColumns) {
      throw new CsvError("CSV has too many columns", line);
    }
    field = "";
    fieldStarted = false;
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else {
        field += char;
        if (char === "\n") line += 1;
      }
      continue;
    }

    if (justClosedQuote && char !== "," && char !== "\r" && char !== "\n") {
      throw new CsvError("Unexpected character after a closing quote", line);
    }
    justClosedQuote = false;

    if (char === '"') {
      if (fieldStarted || field.length > 0) {
        throw new CsvError("Unexpected quote inside an unquoted field", line);
      }
      inQuotes = true;
      quoteLine = line;
      fieldStarted = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      pushRow();
      line += 1;
      fieldStarted = false;
      continue;
    }

    if (char === "\n") {
      pushRow();
      line += 1;
      fieldStarted = false;
      continue;
    }

    field += char;
    fieldStarted = true;
  }

  if (inQuotes) {
    throw new CsvError("Unterminated quoted field", quoteLine);
  }

  // A trailing newline has already produced the last row. Do not append a
  // spurious empty row, but keep a genuinely empty final field.
  if (field.length > 0 || row.length > 0 || fieldStarted) {
    pushRow();
  }

  return rows;
}

/**
 * Parses a CSV file and returns a header plus row objects.
 * Duplicate or blank headers are rejected.
 */
export function readCsvTable(input, limits = {}) {
  const rows = parseCsv(input, limits);
  if (rows.length === 0) {
    throw new CsvError("CSV is empty");
  }
  const header = rows[0].map((column) => column.trim());
  if (header.some((column) => !column)) {
    throw new CsvError("CSV has a blank column name", 1);
  }
  const seen = new Set();
  for (const column of header) {
    const key = column.toLowerCase();
    if (seen.has(key)) {
      throw new CsvError(`CSV has a duplicate column: ${column}`, 1);
    }
    seen.add(key);
  }

  const data = [];
  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index];
    if (values.length === 1 && values[0] === "") continue;
    if (values.length !== header.length) {
      throw new CsvError(
        `Row has ${values.length} cells but the header has ${header.length}`,
        index + 1
      );
    }
    const record = {};
    for (let column = 0; column < header.length; column += 1) {
      record[header[column]] = unguardFormula(values[column]);
    }
    data.push(record);
  }

  return { header, rows: data };
}
