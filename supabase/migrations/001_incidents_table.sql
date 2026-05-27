-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates the incidents table and hardens RLS on both tables.

-- -----------------------------------------------------------------------
-- incidents table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id               text PRIMARY KEY,
    title            text        NOT NULL,
    description      text        NOT NULL,
    severity         text        NOT NULL CHECK (severity IN ('LOW','MODERATE','HIGH','CRITICAL')),
    lifecycle        text        NOT NULL CHECK (lifecycle IN ('REPORTED','VERIFIED','ACTIVE','RESOLVED')),
    zone_id          text        NOT NULL,
    zone_name        text        NOT NULL,
    zone_district    text        NOT NULL,
    zone_municipality text,
    latitude         float8      NOT NULL,
    longitude        float8      NOT NULL,
    reported_at      timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL
);

-- Indexes for the query patterns used by the API
CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON incidents (reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity    ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_lifecycle   ON incidents (lifecycle);

-- -----------------------------------------------------------------------
-- RLS — incidents
-- Service key (used by the backend sync job) bypasses RLS automatically.
-- Anon key gets read-only access; no client can write incidents directly.
-- -----------------------------------------------------------------------
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_public_read"
ON incidents FOR SELECT
USING (true);

-- -----------------------------------------------------------------------
-- RLS — reports
-- Was disabled for development. Enable now with permissive policies.
-- Service key still bypasses RLS, so the backend is unaffected.
-- -----------------------------------------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_public_read"
ON reports FOR SELECT
USING (true);

CREATE POLICY "reports_public_insert"
ON reports FOR INSERT
WITH CHECK (true);
