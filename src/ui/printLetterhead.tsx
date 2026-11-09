import { useEffect } from "react";

export type PrintLetterheadMode = "built_in" | "preprinted";

export interface PrintLetterheadConfig {
  mode: PrintLetterheadMode;
  topMm: number;
  rightMm: number;
  bottomMm: number;
  leftMm: number;
}

export const REPORT_SIGNATURE_KEY = "print_report_signature";

export const PRINT_LETTERHEAD_KEYS = [
  "print_letterhead_mode",
  "print_invoice_letterhead_mode",
  "print_margin_top_mm",
  "print_margin_right_mm",
  "print_margin_bottom_mm",
  "print_margin_left_mm",
  REPORT_SIGNATURE_KEY,
] as const;

type LetterheadModeKey =
  | "print_letterhead_mode"
  | "print_invoice_letterhead_mode";

export const DEFAULT_PRINT_LETTERHEAD: PrintLetterheadConfig = {
  mode: "built_in",
  topMm: 45,
  rightMm: 12,
  bottomMm: 18,
  leftMm: 12,
};

function margin(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 80) return fallback;
  return Math.round(parsed * 10) / 10;
}

function readMode(
  settings: Record<string, string>,
  key: LetterheadModeKey
): PrintLetterheadConfig {
  return {
    mode: settings[key] === "preprinted" ? "preprinted" : "built_in",
    topMm: margin(settings.print_margin_top_mm, DEFAULT_PRINT_LETTERHEAD.topMm),
    rightMm: margin(settings.print_margin_right_mm, DEFAULT_PRINT_LETTERHEAD.rightMm),
    bottomMm: margin(
      settings.print_margin_bottom_mm,
      DEFAULT_PRINT_LETTERHEAD.bottomMm
    ),
    leftMm: margin(settings.print_margin_left_mm, DEFAULT_PRINT_LETTERHEAD.leftMm),
  };
}

/** Header/margin configuration used by pathology and X-ray reports. */
export function readPrintLetterhead(
  settings: Record<string, string>
): PrintLetterheadConfig {
  return readMode(settings, "print_letterhead_mode");
}

/** Invoices can use a different stationery from clinical reports. */
export function readInvoicePrintLetterhead(
  settings: Record<string, string>
): PrintLetterheadConfig {
  return readMode(settings, "print_invoice_letterhead_mode");
}

/**
 * Applies tenant-specific A4 page margins only while a print view is mounted.
 * The global stylesheet keeps its 10 mm default for non-configured documents.
 */
export function PrintPageStyle({ config }: { config: PrintLetterheadConfig }) {
  useEffect(() => {
    if (config.mode === "preprinted") {
      document.documentElement.dataset.letterhead = "preprinted";
    } else {
      delete document.documentElement.dataset.letterhead;
    }
    return () => {
      delete document.documentElement.dataset.letterhead;
    };
  }, [config.mode]);

  if (config.mode !== "preprinted") return null;

  return (
    <style>{`@page { size: A4 portrait; margin: ${config.topMm}mm ${config.rightMm}mm ${config.bottomMm}mm ${config.leftMm}mm; }`}</style>
  );
}

export function printLetterheadHideClass(config: PrintLetterheadConfig): string {
  return config.mode === "preprinted" ? "print-letterhead-hide" : "";
}

/** Defaults to showing the report signatory block. */
export function shouldPrintReportSignature(
  settings: Record<string, string>
): boolean {
  return settings[REPORT_SIGNATURE_KEY] !== "0";
}

export function PrintLetterheadHint({
  config,
}: {
  config: PrintLetterheadConfig;
}) {
  return (
    <p className="no-print text-[11px] leading-4 text-slate-500">
      {config.mode === "preprinted" ? (
        <>
          Pre-printed letterhead mode: the built-in centre header is hidden. Page
          margins: top {config.topMm} mm, right {config.rightMm} mm, bottom{" "}
          {config.bottomMm} mm, left {config.leftMm} mm.{" "}
        </>
      ) : (
        "Print tip: "
      )}
      In the print dialog choose A4 and actual size, and turn off{" "}
      <b>Headers and footers</b>. The browser adds the tauri.localhost URL at the
      bottom; it is not part of the report.
    </p>
  );
}
