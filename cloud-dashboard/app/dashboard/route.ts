import { authorised, dashboardConfigured } from "@/lib/auth";
import { centralPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventRow {
  entity_type: "invoice" | "report" | "admission";
  entity_id: string;
  operation: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function inr(paise: unknown): string {
  const value = Number(paise ?? 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function dateTime(value: unknown): string {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleString("en-IN");
}

async function loadEvents(tenant: string): Promise<EventRow[]> {
  const client = await centralPool().connect();
  try {
    const result = await client.query<EventRow>(
      `
        SELECT entity_type, entity_id, operation, payload, occurred_at
        FROM (
          SELECT DISTINCT ON (entity_type, entity_id)
            entity_type, entity_id, operation, payload, occurred_at
          FROM sync_events
          WHERE tenant_id = $1
          ORDER BY entity_type, entity_id, occurred_at DESC, received_at DESC
        ) latest
        WHERE operation = 'upsert'
          AND COALESCE((payload->>'deleted')::int, 0) = 0
        ORDER BY occurred_at DESC
      `,
      [tenant]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

function page(tenant: string, rows: EventRow[]): string {
  const invoices = rows.filter((r) => r.entity_type === "invoice");
  const reports = rows.filter((r) => r.entity_type === "report");
  const admissions = rows.filter((r) => r.entity_type === "admission");
  const salesTotal = invoices.reduce(
    (sum, row) => sum + Number(row.payload.total_paise ?? 0),
    0
  );
  const admitted = admissions.filter((row) => row.payload.status === "admitted").length;

  const invoiceRows = invoices
    .slice(0, 12)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.payload.invoice_no)}</td>
          <td>${escapeHtml(row.payload.patient_name || row.payload.patient_id)}</td>
          <td>${escapeHtml(row.payload.status)}</td>
          <td class="num">${inr(row.payload.total_paise)}</td>
        </tr>`
    )
    .join("");

  const reportRows = reports
    .slice(0, 12)
    .map((row) => {
      const parameters = Array.isArray(row.payload.parameters)
        ? row.payload.parameters
        : [];
      return `
        <tr>
          <td>${escapeHtml(row.payload.test_name)}</td>
          <td>${escapeHtml(row.payload.status)}</td>
          <td>${escapeHtml(row.payload.result_text || `${parameters.length} parameter(s)`)}</td>
          <td class="muted">${dateTime(row.payload.reported_at || row.payload.updated_at)}</td>
        </tr>`;
    })
    .join("");

  const admissionRows = admissions
    .slice(0, 12)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.payload.admission_no)}</td>
          <td>${escapeHtml(row.payload.ward)} / ${escapeHtml(row.payload.bed)}</td>
          <td>${escapeHtml(row.payload.status)}</td>
          <td class="muted">${escapeHtml(row.payload.diagnosis || row.payload.reason || "—")}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MediCore central dashboard</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; background: #f1f5f9; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { background: #0f172a; color: white; padding: 18px 24px; }
    header h1 { margin: 0; font-size: 20px; }
    header p { margin: 3px 0 0; color: #94a3b8; font-size: 12px; }
    main { max-width: 1180px; margin: 0 auto; padding: 22px; display: grid; gap: 18px; }
    .cards { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card h2 { margin: 0 0 8px; font-size: 13px; color: #64748b; font-weight: 600; }
    .metric { font-size: 28px; font-weight: 700; }
    .section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; overflow-x: auto; }
    .section h2 { margin: 0 0 10px; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: 0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { color: #64748b; }
    .empty { color: #94a3b8; font-size: 12px; padding: 14px 0; }
    footer { color: #94a3b8; font-size: 11px; text-align: center; padding: 0 22px 22px; }
  </style>
</head>
<body>
  <header>
    <h1>MediCore central dashboard</h1>
    <p>Tenant ${escapeHtml(tenant)} · read-only cloud view · updated ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
  </header>
  <main>
    <div class="cards">
      <div class="card"><h2>Latest sales total</h2><div class="metric">${inr(salesTotal)}</div></div>
      <div class="card"><h2>Invoices</h2><div class="metric">${invoices.length}</div></div>
      <div class="card"><h2>Diagnostic reports</h2><div class="metric">${reports.length}</div></div>
      <div class="card"><h2>Admitted patients</h2><div class="metric">${admitted}</div></div>
    </div>

    <section class="section">
      <h2>Recent sales</h2>
      ${invoiceRows ? `<table><thead><tr><th>Invoice</th><th>Patient</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>${invoiceRows}</tbody></table>` : `<p class="empty">No synced invoices yet.</p>`}
    </section>

    <section class="section">
      <h2>Diagnostic reports</h2>
      ${reportRows ? `<table><thead><tr><th>Test</th><th>Status</th><th>Result</th><th>Reported</th></tr></thead><tbody>${reportRows}</tbody></table>` : `<p class="empty">No synced reports yet.</p>`}
    </section>

    <section class="section">
      <h2>Admissions</h2>
      ${admissionRows ? `<table><thead><tr><th>Admission</th><th>Ward / bed</th><th>Status</th><th>Reason / diagnosis</th></tr></thead><tbody>${admissionRows}</tbody></table>` : `<p class="empty">No synced admissions yet.</p>`}
    </section>
  </main>
  <footer>Read-only dashboard. Clinical and financial source records remain on the terminal.</footer>
</body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  if (!dashboardConfigured()) {
    return new Response("Dashboard authentication is not configured.", { status: 503 });
  }
  if (!authorised(request)) {
    return new Response("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="MediCore", charset="UTF-8"' },
    });
  }

  const tenant =
    new URL(request.url).searchParams.get("tenant") ||
    process.env.DEFAULT_TENANT_ID ||
    "tenant-default";

  try {
    const rows = await loadEvents(tenant);
    return new Response(page(tenant, rows), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Dashboard query failed", error);
    return new Response("Dashboard unavailable.", { status: 500 });
  }
}
