-- Wir verbinden uns sicherheitshalber explizit zur DB (falls Skript global läuft)
\c evoting_db;

-- 1. Tabelle erstellen
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

-- 2. EIGENTÜMER SETZEN (Der entscheidende Fix)
-- Da 'audit_logger' der Superuser ist (via docker-compose), 
-- stellen wir sicher, dass ihm alles explizit gehört.
ALTER TABLE audit_log OWNER TO audit_logger;
ALTER SEQUENCE audit_log_id_seq OWNER TO audit_logger;

-- 3. Rechte für die Zukunft sichern
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO audit_logger;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO audit_logger;