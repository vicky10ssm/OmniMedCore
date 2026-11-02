// Invoice engine: totals, saving, payments and cancellation.
//
// Money rules (see FEATURE_DECISIONS.md):
//  - every amount is an integer in paise
//  - prices are PRE-TAX; GST is added on top, split 50/50 into CGST + SGST
//  - line discount reduces the taxable value of that line
//  - the grand total is rounded to the nearest rupee; the difference is stored
//    as round_off_paise so the books always add up
//  - invoices are effectively append-only: corrections = cancel + re-issue
//  - referral commissions are not accrued or exposed in the current product

import type { DataSource } from "./index";
import { writeAudit } from "./audit";
import { getDeviceId, now, uuid } from "./helpers";
import { allocateInvoiceNo } from "./invoiceNo";
import { getCurrentTenantId, tenantAnd } from "./tenant";
import type { InvoiceRow, PackageItemRow, TestRow } from "./types";

export type PaymentMode = "cash" | "upi" | "card" | "bank" | "credit";

export interface BillLineInput {
  item_type: "test" | "package";
  test_id: string;
  package_id: string;
  description: string;
  qty: number;
  unit_price_paise: number;
  gst_rate_bp: number;
  discount_paise: number;
}

export interface BillInput {
  patientId: string;
  patientName: string;
  doctorId: string;
  invoiceDate: number;
  lines: BillLineInput[];
  notes: string;
  /** Amount actually collected now (ignored for mode "credit"). */
  paymentPaise: number;
  paymentMode: PaymentMode;
}

export interface LineTotals {
  gross: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  tax: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  tenantParams: number;
  exact: number;
  roundOff: number;
  total: number;
}

export function computeLine(line: BillLineInput): LineTotals {
  const qty = Math.max(1, Math.floor(line.qty || 1));
  const gross = Math.round(line.unit_price_paise * qty);
  const discount = Math.min(Math.max(Math.round(line.discount_paise || 0), 0), gross);
  const taxable = gross - discount;
  const tax = Math.round((taxable * Math.max(0, line.gst_rate_bp)) / 10000);
  const cgst = Math.floor(tax / 2);
  return { gross, discount, taxable, cgst, sgst: tax - cgst, tax };
}

export function computeTotals(lines: BillLineInput[]): InvoiceTotals {
  let subtotal = 0;
  let discount = 0;
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  for (const line of lines) {
    const t = computeLine(line);
    subtotal += t.gross;
    discount += t.discount;
    taxable += t.taxable;
    cgst += t.cgst;
    sgst += t.sgst;
  }
  const exact = taxable + cgst + sgst;
  const total = Math.round(exact / 100) * 100;
  return {
    subtotal,
    discount,
    taxable,
    cgst,
    sgst,
    tenantParams: exact,
    exact,
    roundOff: total - exact,
    total,
  };
}

/** Saves a finalized invoice (+ line items, report orders, payment). */
export async function saveInvoice(
  db: DataSource,
  input: BillInput,
  userId: string
): Promise<{ id: string; invoiceNo: string }> {
  if (input.lines.length === 0) throw new Error("Add at least one test to bill");
  if (!input.patientId) throw new Error("Select a patient");

  return db.tx(async () => {
    const id = uuid();
    const totals = computeTotals(input.lines);
    const { invoiceNo } = await allocateInvoiceNo(db);

    const credit = input.paymentMode === "credit";
    const paid = credit
      ? 0
      : Math.min(Math.max(0, Math.round(input.paymentPaise)), totals.total);
    const status: InvoiceRow["status"] =
      paid <= 0 ? "unpaid" : paid >= totals.total ? "paid" : "partial";

    const ts = now();
    const deviceId = getDeviceId();
    const createdAt = ts;
    const tenantId = getCurrentTenantId();

    await db.run(
      `INSERT INTO invoices (id, invoice_no, invoice_date, patient_id, doctor_id, patient_name,
         subtotal_paise, discount_paise, taxable_paise, cgst_paise, sgst_paise, round_off_paise,
         total_paise, status, cancel_reason, notes, created_by,
         created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?,?,?,1,0,?)`,
      [
        id,
        invoiceNo,
        input.invoiceDate,
        input.patientId,
        input.doctorId,
        input.patientName,
        totals.subtotal,
        totals.discount,
        totals.taxable,
        totals.cgst,
        totals.sgst,
        totals.roundOff,
        totals.total,
        status,
        input.notes.trim(),
        userId,
        createdAt,
        ts,
        deviceId,
        tenantId,
      ]
    );

    let lineNo = 1;
    let sampleSequence = 1;
    const sampleIds: string[] = [];
    for (const line of input.lines) {
      const t = computeLine(line);
      await db.run(
        `INSERT INTO invoice_items (id, invoice_id, line_no, item_type, test_id, package_id,
           description, qty, unit_price_paise, gst_rate_bp, amount_paise, taxable_paise,
           cgst_paise, sgst_paise, created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
        [
          uuid(),
          id,
          lineNo++,
          line.item_type,
          line.test_id,
          line.package_id,
          line.description,
          Math.max(1, Math.floor(line.qty || 1)),
          line.unit_price_paise,
          line.gst_rate_bp,
          t.gross,
          t.taxable,
          t.cgst,
          t.sgst,
          createdAt,
          ts,
          deviceId,
          tenantId,
        ]
      );

      // Work-list entries for the lab / X-ray desk.
      if (line.item_type === "test" && line.test_id) {
        const [tenantClause, tenantParams] = tenantAnd();
        const test = await db.get<TestRow>(
          `SELECT * FROM tests WHERE id = ? ${tenantClause}`,
          [line.test_id, ...tenantParams]
        );
        if (test) {
          const created = await insertReportOrder(db, {
            invoiceId: id,
            invoiceNo,
            patientId: input.patientId,
            testId: test.id,
            testName: test.name,
            category: test.category,
            specimenType: test.specimen_type,
            containerType: test.container_type,
            packageId: "",
            unit: test.unit,
            refRange: test.ref_range,
            refMin: test.ref_min,
            refMax: test.ref_max,
            userId,
            sampleSequence: sampleSequence,
          });
          if (created.sampleId) {
            sampleIds.push(created.sampleId);
            sampleSequence += 1;
          }
        }
      } else if (line.item_type === "package" && line.package_id) {
        const [tenantClause, tenantParams] = tenantAnd();
        const items = await db.all<PackageItemRow>(
          `SELECT * FROM package_items WHERE package_id = ? AND deleted = 0 ${tenantClause}`,
          [line.package_id, ...tenantParams]
        );
        for (const item of items) {
          const test = await db.get<TestRow>(
            `SELECT * FROM tests WHERE id = ? ${tenantClause}`,
            [item.test_id, ...tenantParams]
          );
          if (!test) continue;
          const created = await insertReportOrder(db, {
            invoiceId: id,
            invoiceNo,
            patientId: input.patientId,
            testId: test.id,
            testName: test.name,
            category: test.category,
            specimenType: test.specimen_type,
            containerType: test.container_type,
            packageId: line.package_id,
            unit: test.unit,
            refRange: test.ref_range,
            refMin: test.ref_min,
            refMax: test.ref_max,
            userId,
            sampleSequence: sampleSequence,
          });
          if (created.sampleId) {
            sampleIds.push(created.sampleId);
            sampleSequence += 1;
          }
        }
      }
    }

    if (sampleIds.length > 0) {
      const [tenantClause, tenantParams] = tenantAnd();
      await db.run(
        `UPDATE invoices SET sample_ids = ?, updated_at = ?, dirty = 1
         WHERE id = ? ${tenantClause}`,
        [JSON.stringify(sampleIds), ts, id, ...tenantParams]
      );
    }

    if (paid > 0) {
      await db.run(
        `INSERT INTO payments (id, invoice_id, amount_paise, mode, paid_at, note, created_by,
           created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,0,?)`,
        [
          uuid(),
          id,
          paid,
          input.paymentMode,
          input.invoiceDate,
          "",
          userId,
          createdAt,
          ts,
          deviceId,
          tenantId,
        ]
      );
    }

    await writeAudit(db, {
      userId,
      action: "invoice.create",
      entity: "invoice",
      entityId: id,
      detail: `${invoiceNo} · ${status} · ₹${(totals.total / 100).toFixed(2)}`,
    });

    return { id, invoiceNo };
  });
}

async function insertReportOrder(
  db: DataSource,
  o: {
    invoiceId: string;
    invoiceNo: string;
    patientId: string;
    testId: string;
    testName: string;
    category: string;
    specimenType: string;
    containerType: string;
    packageId: string;
    unit: string;
    refRange: string;
    refMin: number | null;
    refMax: number | null;
    userId: string;
    sampleSequence: number;
  }
): Promise<{ orderId: string; sampleId: string }> {
  const ts = now();
  const orderId = uuid();
  const tenantId = getCurrentTenantId();
  let sampleId = "";
  if (o.category === "Pathology") {
    sampleId = uuid();
    const accessionNo = `${o.invoiceNo}-S${String(o.sampleSequence).padStart(2, "0")}`;
    await db.run(
      `INSERT INTO samples
         (id, accession_no, invoice_id, patient_id, specimen_type, container_type,
          status, collection_site, collected_at, collected_by, received_at, received_by,
          accepted_at, accepted_by, rejected_at, rejected_by, rejection_reason,
          storage_location, transport_note, disposed_at, disposed_by, disposal_method,
          notes, created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,'expected','',NULL,'',NULL,'',NULL,'',NULL,'','','','',NULL,'','',
          'Created with billed order; collection pending',?,?,?,1,0,?)`,
      [
        sampleId,
        accessionNo,
        o.invoiceId,
        o.patientId,
        o.specimenType || "Unspecified",
        o.containerType || "",
        ts,
        ts,
        getDeviceId(),
        tenantId,
      ]
    );
  }

  await db.run(
    `INSERT INTO report_orders (id, invoice_id, patient_id, test_id, test_name, package_id, sample_id,
       status, result_value, result_text, unit, ref_range, ref_min, ref_max, abnormal,
       entered_by, verified_by, reported_at, printed_at,
       created_at, updated_at, device_id, dirty, deleted, tenant_id)
     VALUES (?,?,?,?,?,?,?,'pending',NULL,'',?,?,?,?,0,'','',NULL,NULL,?,?,?,1,0,?)`,
    [
      orderId,
      o.invoiceId,
      o.patientId,
      o.testId,
      o.testName,
      o.packageId,
      sampleId,
      o.unit,
      o.refRange,
      o.refMin,
      o.refMax,
      ts,
      ts,
      getDeviceId(),
      tenantId,
    ]
  );
  return { orderId, sampleId };
}

/** Recomputes invoice status from payments; accrues commission when paid up. */
export async function recalcInvoiceStatus(
  db: DataSource,
  invoiceId: string
): Promise<InvoiceRow["status"]> {
  const [tenantClause, tenantParams] = tenantAnd();
  const inv = await db.get<InvoiceRow>(
    `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
    [invoiceId, ...tenantParams]
  );
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "cancelled") return "cancelled";

  const paidRow = await db.get<{ paid: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) AS paid FROM payments
     WHERE invoice_id = ? AND deleted = 0 ${tenantClause}`,
    [invoiceId, ...tenantParams]
  );
  const paid = paidRow?.paid ?? 0;
  const status: InvoiceRow["status"] =
    paid <= 0 ? "unpaid" : paid >= inv.total_paise ? "paid" : "partial";

  if (status !== inv.status) {
    await db.run(
      `UPDATE invoices SET status = ?, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
      [status, now(), invoiceId, ...tenantParams]
    );
  }
  return status;
}

export async function addPayment(
  db: DataSource,
  invoiceId: string,
  amountPaise: number,
  mode: PaymentMode,
  note: string,
  userId: string,
  paidAt = now()
): Promise<void> {
  const [tenantClause, tenantParams] = tenantAnd();
  const inv = await db.get<InvoiceRow>(
    `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
    [invoiceId, ...tenantParams]
  );
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "cancelled") throw new Error("Invoice is cancelled");
  const amount = Math.round(amountPaise);
  if (amount <= 0) throw new Error("Payment amount must be positive");

  const paidRow = await db.get<{ paid: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) AS paid FROM payments
     WHERE invoice_id = ? AND deleted = 0 ${tenantClause}`,
    [invoiceId, ...tenantParams]
  );
  const balance = inv.total_paise - (paidRow?.paid ?? 0);
  if (amount > balance) {
    throw new Error(
      `Payment exceeds balance (₹${(balance / 100).toFixed(2)} outstanding)`
    );
  }

  const ts = now();
  await db.run(
    `INSERT INTO payments (id, invoice_id, amount_paise, mode, paid_at, note, created_by,
       created_at, updated_at, device_id, dirty, deleted, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,0,?)`,
    [
      uuid(),
      invoiceId,
      amount,
      mode,
      paidAt,
      note.trim(),
      userId,
      ts,
      ts,
      getDeviceId(),
      getCurrentTenantId(),
    ]
  );
  await writeAudit(db, {
    userId,
    action: "payment.create",
    entity: "invoice",
    entityId: invoiceId,
    detail: `${mode} · ₹${(amount / 100).toFixed(2)}`,
  });
  await recalcInvoiceStatus(db, invoiceId);
}

/** Cancels an invoice (append-only: the row stays, money entries are reversed). */
export async function cancelInvoice(
  db: DataSource,
  invoiceId: string,
  reason: string,
  userId = ""
): Promise<void> {
  const [tenantClause, tenantParams] = tenantAnd();
  const inv = await db.get<InvoiceRow>(
    `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
    [invoiceId, ...tenantParams]
  );
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "cancelled") throw new Error("Already cancelled");

  await db.tx(async () => {
    await db.run(
      `UPDATE invoices SET status = 'cancelled', cancel_reason = ?, updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [reason.trim(), now(), invoiceId, ...tenantParams]
    );
    // Cancel outstanding lab work
    await db.run(
      `UPDATE report_orders SET deleted = 1, updated_at = ?, dirty = 1
       WHERE invoice_id = ? AND status = 'pending' ${tenantClause}`,
      [now(), invoiceId, ...tenantParams]
    );
    await writeAudit(db, {
      userId,
      action: "invoice.cancel",
      entity: "invoice",
      entityId: invoiceId,
      detail: `${inv.invoice_no} · ${reason.trim()}`,
    });
  });
}
