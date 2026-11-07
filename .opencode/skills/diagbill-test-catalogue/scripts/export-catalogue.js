// CDP expression that dumps tests, parameters and packages from a running
// OmniMed Core desktop app.
//
// Run with the app open and WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS set to
// --remote-debugging-port=9222. Use the OpenCode cdp-eval helper (or any
// WebView2 CDP client) to evaluate this file, then pass the JSON output to
// scripts/render-catalogue.mjs.

(async () => {
  try {
    const invoke = window.__TAURI_INTERNALS__.invoke;
    const tests = await invoke("db_select", {
      sql: `SELECT t.id, t.code, t.name, t.category, t.department,
                   t.specimen_type, t.container_type, t.method,
                   t.report_type, t.price_paise, t.gst_rate_bp
            FROM tests t
            WHERE t.deleted = 0
            ORDER BY t.category, t.department, t.name`,
      values: [],
    });
    const parameters = await invoke("db_select", {
      sql: `SELECT t.code AS test_code, tp.name, tp.unit, tp.ref_range,
                   tp.ref_min, tp.ref_max, tp.report_type, tp.sort_order
            FROM test_parameters tp
            JOIN tests t ON t.id = tp.test_id AND t.tenant_id = tp.tenant_id
            WHERE t.deleted = 0 AND tp.deleted = 0
            ORDER BY t.category, t.department, t.name, tp.sort_order, tp.name`,
      values: [],
    });
    const packages = await invoke("db_select", {
      sql: `SELECT p.name AS package_name, p.price_paise, p.gst_rate_bp,
                   t.code AS test_code, t.name AS test_name, t.category
            FROM packages p
            JOIN package_items pi
              ON pi.package_id = p.id AND pi.deleted = 0
             AND pi.tenant_id = p.tenant_id
            JOIN tests t
              ON t.id = pi.test_id AND t.deleted = 0
             AND t.tenant_id = pi.tenant_id
            WHERE p.deleted = 0
            ORDER BY p.name, t.category, t.name`,
      values: [],
    });
    return { tests, parameters, packages };
  } catch (error) {
    return { error: String(error) };
  }
})()
