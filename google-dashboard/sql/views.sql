-- Read-only Looker Studio views over the latest activated snapshot.
-- Raw tables are STRING-only so schema changes never fail a load. Casting is
-- deliberate and happens here, never in the ingestion path.

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_tenants` AS
SELECT
  id,
  name,
  type,
  status
FROM `__PROJECT__.__RAW__.raw_tenants`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_patients` AS
SELECT
  id,
  tenant_id,
  SAFE_CAST(age AS INT64) AS age,
  gender,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(created_at AS INT64)), 'Asia/Kolkata') AS registered_on
FROM `__PROJECT__.__RAW__.raw_patients`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_doctors` AS
SELECT id, tenant_id, name, specialization
FROM `__PROJECT__.__RAW__.raw_doctors`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0
  AND SAFE_CAST(is_active AS INT64) = 1;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_tests` AS
SELECT
  id,
  tenant_id,
  code,
  name,
  category,
  SAFE_CAST(price_paise AS NUMERIC) / 100 AS price_inr,
  SAFE_CAST(gst_rate_bp AS NUMERIC) / 100 AS gst_percent
FROM `__PROJECT__.__RAW__.raw_tests`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_expense_categories` AS
SELECT id, tenant_id, name
FROM `__PROJECT__.__RAW__.raw_expense_categories`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_invoices` AS
SELECT
  id,
  tenant_id,
  invoice_no,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(invoice_date AS INT64)), 'Asia/Kolkata') AS invoice_date,
  patient_id,
  doctor_id,
  status,
  SAFE_CAST(subtotal_paise AS NUMERIC) / 100 AS subtotal_inr,
  SAFE_CAST(discount_paise AS NUMERIC) / 100 AS discount_inr,
  SAFE_CAST(taxable_paise AS NUMERIC) / 100 AS taxable_inr,
  SAFE_CAST(cgst_paise AS NUMERIC) / 100 AS cgst_inr,
  SAFE_CAST(sgst_paise AS NUMERIC) / 100 AS sgst_inr,
  SAFE_CAST(total_paise AS NUMERIC) / 100 AS total_inr
FROM `__PROJECT__.__RAW__.raw_invoices`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_invoice_items` AS
SELECT
  id,
  tenant_id,
  invoice_id,
  SAFE_CAST(line_no AS INT64) AS line_no,
  item_type,
  test_id,
  package_id,
  description,
  SAFE_CAST(qty AS INT64) AS qty,
  SAFE_CAST(unit_price_paise AS NUMERIC) / 100 AS unit_price_inr,
  SAFE_CAST(amount_paise AS NUMERIC) / 100 AS amount_inr
FROM `__PROJECT__.__RAW__.raw_invoice_items`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_payments` AS
SELECT
  id,
  tenant_id,
  invoice_id,
  SAFE_CAST(amount_paise AS NUMERIC) / 100 AS amount_inr,
  mode,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(paid_at AS INT64)), 'Asia/Kolkata') AS paid_on
FROM `__PROJECT__.__RAW__.raw_payments`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_expenses` AS
SELECT
  id,
  tenant_id,
  category_id,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(paid_at AS INT64)), 'Asia/Kolkata') AS paid_on,
  SAFE_CAST(amount_paise AS NUMERIC) / 100 AS amount_inr,
  mode,
  modules
FROM `__PROJECT__.__RAW__.raw_expenses`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_report_orders` AS
SELECT
  id,
  tenant_id,
  invoice_id,
  patient_id,
  test_id,
  test_name,
  status,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(reported_at AS INT64)), 'Asia/Kolkata') AS reported_on,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(specimen_received_at AS INT64)), 'Asia/Kolkata') AS received_on,
  SAFE_CAST(abnormal AS INT64) AS abnormal,
  SAFE_CAST(critical_flag AS INT64) AS critical_flag
FROM `__PROJECT__.__RAW__.raw_report_orders`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_samples` AS
SELECT
  id,
  tenant_id,
  accession_no,
  invoice_id,
  patient_id,
  specimen_type,
  status,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(collected_at AS INT64)), 'Asia/Kolkata') AS collected_on,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(received_at AS INT64)), 'Asia/Kolkata') AS received_on,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(accepted_at AS INT64)), 'Asia/Kolkata') AS accepted_on
FROM `__PROJECT__.__RAW__.raw_samples`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_pharmacy_sales` AS
SELECT
  id,
  tenant_id,
  bill_no,
  patient_id,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(sale_date AS INT64)), 'Asia/Kolkata') AS sale_date,
  SAFE_CAST(total_paise AS NUMERIC) / 100 AS total_inr,
  SAFE_CAST(cgst_paise AS NUMERIC) / 100 AS cgst_inr,
  SAFE_CAST(sgst_paise AS NUMERIC) / 100 AS sgst_inr,
  payment_mode,
  status
FROM `__PROJECT__.__RAW__.raw_pharmacy_sales`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_admissions` AS
SELECT
  id,
  tenant_id,
  admission_no,
  patient_id,
  doctor_id,
  status,
  ward,
  bed,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(admitted_at AS INT64)), 'Asia/Kolkata') AS admitted_on,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(discharged_at AS INT64)), 'Asia/Kolkata') AS discharged_on
FROM `__PROJECT__.__RAW__.raw_admissions`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_hospital_charges` AS
SELECT
  id,
  tenant_id,
  admission_id,
  patient_id,
  service_id,
  SAFE_CAST(qty AS INT64) AS qty,
  SAFE_CAST(amount_paise AS NUMERIC) / 100 AS amount_inr,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(charged_at AS INT64)), 'Asia/Kolkata') AS charged_on
FROM `__PROJECT__.__RAW__.raw_hospital_charges`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_hospital_bill_payments` AS
SELECT
  id,
  tenant_id,
  admission_id,
  SAFE_CAST(amount_paise AS NUMERIC) / 100 AS amount_inr,
  mode,
  DATE(TIMESTAMP_MILLIS(SAFE_CAST(paid_at AS INT64)), 'Asia/Kolkata') AS paid_on
FROM `__PROJECT__.__RAW__.raw_hospital_bill_payments`
WHERE _snapshot_id = (SELECT snapshot_id FROM `__PROJECT__.__RAW__._current_snapshot` WHERE singleton = 1)
  AND SAFE_CAST(deleted AS INT64) = 0;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_daily_collections` AS
SELECT tenant_id, paid_on AS collection_date, mode, SUM(amount_inr) AS collected_inr, COUNT(*) AS payment_count
FROM `__PROJECT__.__REPORTING__.v_payments`
GROUP BY tenant_id, collection_date, mode
UNION ALL
SELECT tenant_id, sale_date AS collection_date, payment_mode AS mode, SUM(total_inr) AS collected_inr, COUNT(*) AS payment_count
FROM `__PROJECT__.__REPORTING__.v_pharmacy_sales`
WHERE status = 'paid'
GROUP BY tenant_id, collection_date, mode
UNION ALL
SELECT tenant_id, paid_on AS collection_date, mode, SUM(amount_inr) AS collected_inr, COUNT(*) AS payment_count
FROM `__PROJECT__.__REPORTING__.v_hospital_bill_payments`
GROUP BY tenant_id, collection_date, mode;

CREATE OR REPLACE VIEW `__PROJECT__.__REPORTING__.v_data_freshness` AS
SELECT
  snapshot_id,
  tenant_id,
  exported_at,
  activated_at,
  run_id,
  table_counts
FROM `__PROJECT__.__RAW__._current_snapshot`
WHERE singleton = 1;
