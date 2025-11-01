BEGIN;

CREATE SCHEMA IF NOT EXISTS election AUTHORIZATION election;

ALTER DATABASE election_db SET search_path TO election, public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA election;

ALTER SCHEMA election OWNER TO election;

COMMIT;
