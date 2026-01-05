\c election_db;

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id_hash TEXT,
    actor_role TEXT,
    ip_hash TEXT,
    session_hash TEXT,
    action_type TEXT NOT NULL,
    level TEXT NOT NULL,
    details JSONB NOT NULL,
    prev_hash TEXT,
    entry_hash TEXT,
    signature TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
GRANT ALL ON audit_log TO election;
GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO election;