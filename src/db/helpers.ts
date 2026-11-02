// Small shared helpers: ids, timestamps, sync column defaults, money formatting.

let deviceId = "";

export function setDeviceId(id: string): void {
  deviceId = id;
}

export function getDeviceId(): string {
  return deviceId;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

/** Sync column defaults for a brand-new row (dirty=1 → needs push when sync arrives). */
export function newRow(): {
  created_at: number;
  updated_at: number;
  device_id: string;
  dirty: number;
  deleted: number;
} {
  return {
    created_at: now(),
    updated_at: now(),
    device_id: deviceId,
    dirty: 1,
    deleted: 0,
  };
}

export function touch(): { updated_at: number; dirty: number } {
  return { updated_at: now(), dirty: 1 };
}

// ---- Money (paise is the stored unit; rupees only at the UI edge) ----

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** formatINR(123456) → "₹1,234.56" */
export function formatINR(paise: number): string {
  return inr.format(paise / 100);
}

/** 1200 (basis points) → "12%" ; 750 → "7.5%" */
export function formatGstRate(bp: number): string {
  const pct = bp / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Split GST into CGST + SGST halves (paise). */
export function cgstSgst(taxPaise: number): [number, number] {
  const cgst = Math.floor(taxPaise / 2);
  return [cgst, taxPaise - cgst];
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
