BEGIN;

CREATE TABLE IF NOT EXISTS football_api_usage (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usage_date        DATE NOT NULL UNIQUE,
    request_count     INT NOT NULL DEFAULT 0,
    daily_limit       INT NOT NULL DEFAULT 7500,
    last_requested_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_football_api_usage_date ON football_api_usage(usage_date);

ALTER TABLE football_api_usage
    ADD CONSTRAINT chk_request_count_within_limit
    CHECK (request_count <= daily_limit);

COMMIT;
