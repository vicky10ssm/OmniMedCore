// Invoice number allocation.
//
// Numbers come in BLOCKS so two terminals billing offline can never print the
// same invoice number:
//   - each terminal draws a block (invoice_blocks row) and consumes it locally
//   - when a block runs out, a new block is requested (today: extended locally;
//     once cloud sync lands: assigned by the server so ranges never overlap)
//
// The device code ("A", "B"…) is embedded in the number as a second safety net
// and can be switched off once server-assigned blocks are in place
// (settings key: invoice_device_code = '0').

import type { DataSource } from "./index";
import { getDeviceId, now, uuid } from "./helpers";
import type { InvoiceBlockRow } from "./types";
import { getSetting } from "./settings";
import { getCurrentTenantId, tenantAnd } from "./tenant";

const BLOCK_SIZE = 1000;

/**
 * Block-allocated human-readable number for non-invoice documents
 * (admissions, pharmacy receipts). Includes the terminal code so two offline
 * devices cannot produce the same display number.
 */
export async function allocateDocumentNo(
  db: DataSource,
  purpose: string,
  prefix: string,
  width = 5
): Promise<{ documentNo: string; seq: number }> {
  const deviceCode = await getSetting(db, "device_code", "A");
  const [tenantClause, tenantParams] = tenantAnd();
  const block = await db.get<InvoiceBlockRow>(
    `SELECT * FROM invoice_blocks
     WHERE purpose = ? AND deleted = 0 ${tenantClause}
     ORDER BY end_no DESC LIMIT 1`,
    [purpose, ...tenantParams]
  );
  let seq: number;
  if (!block || block.next_no > block.end_no) {
    seq = block ? block.end_no + 1 : 1;
    await db.run(
      `INSERT INTO invoice_blocks (id, purpose, prefix, next_no, end_no,
         created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,?,?,1,0,?)`,
      [
        uuid(),
        purpose,
        prefix,
        seq + 1,
        seq + BLOCK_SIZE - 1,
        now(),
        now(),
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
  } else {
    seq = block.next_no;
    await db.run(
      `UPDATE invoice_blocks SET next_no = ?, updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [seq + 1, now(), block.id, ...tenantParams]
    );
  }
  return {
    documentNo: `${prefix}${deviceCode || "A"}-${String(seq).padStart(width, "0")}`,
    seq,
  };
}

export interface AllocatedInvoiceNo {
  invoiceNo: string;
  /** The raw sequence number (useful for reporting). */
  seq: number;
}

export async function allocateInvoiceNo(
  db: DataSource
): Promise<AllocatedInvoiceNo> {
  const prefix = await getSetting(db, "invoice_prefix", "INV-");
  const deviceCode = await getSetting(db, "device_code", "A");
  const useDeviceCode = await getSetting(db, "invoice_device_code", "1");

  const [tenantClause, tenantParams] = tenantAnd();
  const block = await db.get<InvoiceBlockRow>(
    `SELECT * FROM invoice_blocks
     WHERE purpose = 'invoice' AND deleted = 0 ${tenantClause}
     ORDER BY end_no DESC LIMIT 1`,
    tenantParams
  );

  let seq: number;

  if (!block || block.next_no > block.end_no) {
    seq = block ? block.end_no + 1 : 1;
    const endNo = seq + BLOCK_SIZE - 1;
    await db.run(
      `INSERT INTO invoice_blocks (id, purpose, prefix, next_no, end_no,
         created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?, 'invoice', ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
      [
        uuid(),
        prefix,
        seq + 1,
        endNo,
        now(),
        now(),
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
  } else {
    seq = block.next_no;
    await db.run(
      `UPDATE invoice_blocks SET next_no = ?, updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [seq + 1, now(), block.id, ...tenantParams]
    );
  }

  const code = useDeviceCode === "1" && deviceCode ? `${deviceCode}-` : "";
  return { invoiceNo: `${prefix}${code}${String(seq).padStart(5, "0")}`, seq };
}
