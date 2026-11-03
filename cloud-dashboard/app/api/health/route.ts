import { authorisedSync, syncCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: syncCorsHeaders() });
}

export async function GET(request: Request): Promise<Response> {
  const headers = syncCorsHeaders();
  if (!authorisedSync(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, service: "medicore-sync" }), {
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
