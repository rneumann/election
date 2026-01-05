DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='election') THEN
    CREATE ROLE election LOGIN PASSWORD 'election';
  END IF;
END$$;

CREATE SCHEMA IF NOT EXISTS election AUTHORIZATION election;

ALTER ROLE election SET search_path TO election, public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA election;

ALTER SCHEMA election OWNER TO election;
GRANT USAGE ON SCHEMA election TO election;
