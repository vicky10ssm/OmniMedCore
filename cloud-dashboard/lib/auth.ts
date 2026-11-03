function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function authorised(request: Request): boolean {
  const user = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!user || !password) return false;

  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  const actual = request.headers.get("authorization") || "";
  return constantTimeEqual(actual, expected);
}

export function dashboardConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_USER && process.env.DASHBOARD_PASSWORD);
}

export function authorisedSync(request: Request): boolean {
  const token = process.env.SYNC_INGEST_TOKEN;
  if (!token) return false;
  const actual = request.headers.get("authorization") || "";
  return constantTimeEqual(actual, `Bearer ${token}`);
}

export function syncCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.SYNC_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
