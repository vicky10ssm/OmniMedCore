// Invoice engine: totals, saving, payments and cancellation.
//
// Money rules (see FEATURE_DECISIONS.md):
//  - every amount is an integer in paise
//  - prices are PRE-TAX; GST is added on top, split 50/50 into CGST + SGST
//  - line discount reduces the taxable value of that line
//  - the grand total is rounded to the nearest rupee; the difference is stored
//    as round_off_paise so the books always add up
//  - invoice numbers/dates are immutable; a bill may be amended only while its
//    linked lab work is still work-free, otherwise cancel + re-issue
//  - payments remain append-only; an amendment cannot reduce the total below
//    payments already collected
//  - referral commissions are not accrued or exposed in the current product

import type { DataSource } from "./index";
import { writeAudit } from "./audit";
import { getDeviceId, now, uuid } from "./helpers";
import { allocateInvoiceNo } from "./invoiceNo";
import { getCurrentTenantId, tenantAnd } from "./tenant";
import type {
  InvoiceItemRow,
  InvoiceRow,
  PackageItemRow,
  ReportOrderRow,
  ReportParameterRow,
  SampleRow,
  TestRow,
} from "./types";

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

export interface AmendBillLineInput extends BillLineInput {
  /** Existing invoice_items id. Omit for a newly added line. */
  id?: string;
}

export interface AmendBillInput {
  invoiceId: string;
  doctorId: string;
  notes: string;
  lines: AmendBillLineInput[];
  userId: string;
}

/**
 * Amends an existing invoice without changing its number or date.
 *
 * Safe boundaries:
 * - the invoice must not be cancelled
 * - a new total cannot be lower than payments already collected
 * - a line can only be removed while its linked orders are still pending, have
 *   no entered results and its sample is still expected (not collected/accepted)
 * - an existing line's test/package identity cannot be changed; remove it and
 *   add the correct item instead
 */
export async function amendInvoice(
  db: DataSource,
  input: AmendBillInput
): Promise<{ total: number }> {
  if (input.lines.length === 0) {
    throw new Error("Add at least one test or package to the bill");
  }

  return db.tx(async () => {
    const [tenantClause, tenantParams] = tenantAnd();
    const invoice = await db.get<InvoiceRow>(
      `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
      [input.invoiceId, ...tenantParams]
    );
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "cancelled") {
      throw new Error("Cancelled invoices cannot be amended");
    }

    const currentItems = await db.all<InvoiceItemRow>(
      `SELECT * FROM invoice_items
       WHERE invoice_id = ? AND deleted = 0 ${tenantClause}
       ORDER BY line_no`,
      [input.invoiceId, ...tenantParams]
    );
    const currentById = new Map(currentItems.map((item) => [item.id, item]));
    const retainedIds = new Set(
      input.lines.map((line) => line.id).filter(Boolean) as string[]
    );
    const removed = currentItems.filter((item) => !retainedIds.has(item.id));

    const identity = (item: {
      item_type: string;
      test_id: string;
      package_id: string;
    }) =>
      `${item.item_type}:${
        item.item_type === "package" ? item.package_id : item.test_id
      }`;
    const currentCounts = new Map<string, number>();
    for (const item of currentItems) {
      currentCounts.set(
        identity(item),
        (currentCounts.get(identity(item)) ?? 0) + 1
      );
    }

    for (const line of input.lines) {
      if (!line.id) continue;
      const current = currentById.get(line.id);
      if (!current) throw new Error("An amended line no longer exists");
      if (
        current.item_type !== line.item_type ||
        current.test_id !== line.test_id ||
        current.package_id !== line.package_id
      ) {
        throw new Error(
          "An existing line's test or package cannot be changed. Remove it and add the correct item instead."
        );
      }
    }

    const ts = now();
    const deviceId = getDeviceId();
    const tenantId = getCurrentTenantId();

    for (const item of removed) {
      if ((currentCounts.get(identity(item)) ?? 0) > 1) {
        throw new Error(
          "This bill has duplicate lines for the same test/package. Keep one line and remove the duplicate only after checking linked work."
        );
      }
      const orderWhere =
        item.item_type === "package"
          ? "package_id = ?"
          : "test_id = ? AND package_id = ''";
      const orderParam =
        item.item_type === "package" ? item.package_id : item.test_id;
      const orders = await db.all<ReportOrderRow>(
        `SELECT * FROM report_orders
         WHERE invoice_id = ? AND deleted = 0 AND ${orderWhere} ${tenantClause}`,
        [input.invoiceId, orderParam, ...tenantParams]
      );
      for (const order of orders) {
        if (
          order.status !== "pending" ||
          order.result_text.trim() ||
          order.result_value !== null ||
          order.abnormal === 1 ||
          order.critical_flag === 1
        ) {
          throw new Error(
            `Cannot remove ${item.description}: a linked report already has work or results.`
          );
        }
        const entered = await db.all<ReportParameterRow>(
          `SELECT * FROM report_parameters
           WHERE report_order_id = ? AND deleted = 0
             AND (result_text <> '' OR result_value IS NOT NULL) ${tenantClause}`,
          [order.id, ...tenantParams]
        );
        if (entered.length > 0) {
          throw new Error(
            `Cannot remove ${item.description}: linked results have already been entered.`
          );
        }
        if (order.sample_id) {
          const sample = await db.get<SampleRow>(
            `SELECT * FROM samples WHERE id = ? AND deleted = 0 ${tenantClause}`,
            [order.sample_id, ...tenantParams]
          );
          if (sample && sample.status !== "expected") {
            throw new Error(
              `Cannot remove ${item.description}: sample ${sample.accession_no} is ${sample.status}.`
            );
          }
        }
      }

      await db.run(
        `UPDATE report_parameters SET deleted = 1, updated_at = ?, dirty = 1
         WHERE report_order_id IN (
           SELECT id FROM report_orders
           WHERE invoice_id = ? AND deleted = 0 AND ${orderWhere} ${tenantClause}
         ) ${tenantClause}`,
        [
          ts,
          input.invoiceId,
          orderParam,
          ...tenantParams,
          ...tenantParams,
        ]
      );
      await db.run(
        `UPDATE report_orders SET deleted = 1, updated_at = ?, dirty = 1
         WHERE invoice_id = ? AND deleted = 0 AND ${orderWhere} ${tenantClause}`,
        [ts, input.invoiceId, orderParam, ...tenantParams]
      );
      for (const order of orders) {
        if (!order.sample_id) continue;
        await db.run(
          `UPDATE samples SET deleted = 1, updated_at = ?, dirty = 1
           WHERE id = ? AND status = 'expected' ${tenantClause}`,
          [ts, order.sample_id, ...tenantParams]
        );
      }
      await db.run(
        `UPDATE invoice_items SET deleted = 1, updated_at = ?, dirty = 1
         WHERE id = ? ${tenantClause}`,
        [ts, item.id, ...tenantParams]
      );
    }

    const sampleCount = await db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM samples WHERE invoice_id = ? ${tenantClause}`,
      [input.invoiceId, ...tenantParams]
    );
    let sampleSequence = (sampleCount?.n ?? 0) + 1;
    let lineNo = 1;

    for (const line of input.lines) {
      const totalsLine = computeLine(line);
      const qty = Math.max(1, Math.floor(line.qty || 1));
      if (line.id) {
        await db.run(
          `UPDATE invoice_items
           SET line_no = ?, description = ?, qty = ?, unit_price_paise = ?,
               gst_rate_bp = ?, amount_paise = ?, taxable_paise = ?,
               cgst_paise = ?, sgst_paise = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            lineNo,
            line.description,
            qty,
            line.unit_price_paise,
            line.gst_rate_bp,
            totalsLine.gross,
            totalsLine.taxable,
            totalsLine.cgst,
            totalsLine.sgst,
            ts,
            line.id,
            ...tenantParams,
          ]
        );
      } else {
        await db.run(
          `INSERT INTO invoice_items
             (id, invoice_id, line_no, item_type, test_id, package_id,
              description, qty, unit_price_paise, gst_rate_bp, amount_paise,
              taxable_paise, cgst_paise, sgst_paise, created_at, updated_at,
              device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            input.invoiceId,
            lineNo,
            line.item_type,
            line.test_id,
            line.package_id,
            line.description,
            qty,
            line.unit_price_paise,
            line.gst_rate_bp,
            totalsLine.gross,
            totalsLine.taxable,
            totalsLine.cgst,
            totalsLine.sgst,
            ts,
            ts,
            deviceId,
            tenantId,
          ]
        );

        if (line.item_type === "test" && line.test_id) {
          const test = await db.get<TestRow>(
            `SELECT * FROM tests WHERE id = ? ${tenantClause}`,
            [line.test_id, ...tenantParams]
          );
          if (test) {
            const created = await insertReportOrder(db, {
              invoiceId: input.invoiceId,
              invoiceNo: invoice.invoice_no,
              patientId: invoice.patient_id,
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
              userId: input.userId,
              sampleSequence,
            });
            if (created.sampleId) sampleSequence += 1;
          }
        } else if (line.item_type === "package" && line.package_id) {
          const items = await db.all<PackageItemRow>(
            `SELECT * FROM package_items
             WHERE package_id = ? AND deleted = 0 ${tenantClause}`,
            [line.package_id, ...tenantParams]
          );
          for (const item of items) {
            const test = await db.get<TestRow>(
              `SELECT * FROM tests WHERE id = ? ${tenantClause}`,
              [item.test_id, ...tenantParams]
            );
            if (!test) continue;
            const created = await insertReportOrder(db, {
              invoiceId: input.invoiceId,
              invoiceNo: invoice.invoice_no,
              patientId: invoice.patient_id,
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
              userId: input.userId,
              sampleSequence,
            });
            if (created.sampleId) sampleSequence += 1;
          }
        }
      }
      lineNo += 1;
    }

    const totals = computeTotals(input.lines);
    const paidRow = await db.get<{ paid: number }>(
      `SELECT COALESCE(SUM(amount_paise), 0) AS paid FROM payments
       WHERE invoice_id = ? AND deleted = 0 ${tenantClause}`,
      [input.invoiceId, ...tenantParams]
    );
    const paid = paidRow?.paid ?? 0;
    if (totals.total < paid) {
      throw new Error(
        `The amended total is below payments already collected. Refund or cancel/reissue the bill instead.`
      );
    }
    const status: InvoiceRow["status"] =
      paid <= 0 ? "unpaid" : paid >= totals.total ? "paid" : "partial";
    const sampleRows = await db.all<{ id: string }>(
      `SELECT id FROM samples WHERE invoice_id = ? AND deleted = 0 ${tenantClause}`,
      [input.invoiceId, ...tenantParams]
    );

    await db.run(
      `UPDATE invoices
       SET subtotal_paise = ?, discount_paise = ?, taxable_paise = ?,
           cgst_paise = ?, sgst_paise = ?, round_off_paise = ?, total_paise = ?,
           status = ?, doctor_id = ?, notes = ?, sample_ids = ?, updated_at = ?,
           dirty = 1
       WHERE id = ? ${tenantClause}`,
      [
        totals.subtotal,
        totals.discount,
        totals.taxable,
        totals.cgst,
        totals.sgst,
        totals.roundOff,
        totals.total,
        status,
        input.doctorId,
        input.notes.trim(),
        JSON.stringify(sampleRows.map((row) => row.id)),
        ts,
        input.invoiceId,
        ...tenantParams,
      ]
    );

    await writeAudit(db, {
      userId: input.userId,
      action: "invoice.amend",
      entity: "invoice",
      entityId: input.invoiceId,
      detail: `${invoice.invoice_no}: total ${(invoice.total_paise / 100).toFixed(
        2
      )} -> ${(totals.total / 100).toFixed(2)}; lines ${currentItems.length} -> ${
        input.lines.length
      }`,
    });

    return { total: totals.total };
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
