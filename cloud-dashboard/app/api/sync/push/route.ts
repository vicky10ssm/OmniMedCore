import { randomUUID } from "node:crypto";
import { authorisedSync, syncCorsHeaders } from "@/lib/auth";
import { centralPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncEvent {
  queueId: string;
  tenantId: string;
  deviceId: string;
  entityType: "invoice" | "report" | "admission";
  entityId: string;
  operation: "upsert" | "cancel";
  payload: Record<string, unknown>;
  occurredAt: number;
}

function isEvent(value: unknown): value is SyncEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<SyncEvent>;
  return (
    typeof event.queueId === "string" &&
    typeof event.tenantId === "string" &&
    typeof event.deviceId === "string" &&
    ["invoice", "report", "admission"].includes(event.entityType as string) &&
    typeof event.entityId === "string" &&
    ["upsert", "cancel"].includes(event.operation as string) &&
    typeof event.payload === "object" &&
    event.payload !== null &&
    typeof event.occurredAt === "number"
  );
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: syncCorsHeaders() });
}

export async function POST(request: Request): Promise<Response> {
  const cors = syncCorsHeaders();
  if (!authorisedSync(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const events =
    body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)
      ? (body as { events: unknown[] }).events
      : null;

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ error: "No events" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (events.length > 100) {
    return new Response(JSON.stringify({ error: "Batch too large (max 100)" }), {
      status: 413,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!events.every(isEvent)) {
    return new Response(JSON.stringify({ error: "Malformed sync event" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const client = await centralPool().connect();
  try {
    await client.query("BEGIN");
    const acks: Array<{ queueId: string; ackId: string }> = [];
    for (const event of events as SyncEvent[]) {
      await client.query(
        `
          INSERT INTO sync_events
            (queue_id, tenant_id, device_id, entity_type, entity_id, operation, payload, occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
          ON CONFLICT (queue_id) DO NOTHING
        `,
        [
          event.queueId,
          event.tenantId,
          event.deviceId,
          event.entityType,
          event.entityId,
          event.operation,
          JSON.stringify(event.payload),
          event.occurredAt,
        ]
      );
      acks.push({ queueId: event.queueId, ackId: randomUUID() });
    }
    await client.query("COMMIT");
    return new Response(JSON.stringify({ acks }), {
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Sync ingest failed", error);
    return new Response(JSON.stringify({ error: "Ingest failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } finally {
    client.release();
  }
}
