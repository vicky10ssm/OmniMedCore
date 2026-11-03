-- MediCore central sync store (PostgreSQL)
CREATE TABLE IF NOT EXISTS sync_events (
  queue_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'report', 'admission')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'cancel')),
  payload JSONB NOT NULL,
  occurred_at BIGINT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_tenant_entity
  ON sync_events (tenant_id, entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_tenant_received
  ON sync_events (tenant_id, received_at DESC);
